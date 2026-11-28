import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../lib/api'
import { parseScore, previewGrade } from '../lib/grading'
import { colors, font, minTap, radii, shadow, spacing } from '../theme'
import PrimaryButton from './PrimaryButton'

// Administrator grade entry, the phone version of the web "Grade Entry Form" (src/pages/FormPage.jsx).
// Same steps: student -> academic term -> approved course -> raw score. The API only receives
// { enrollmentId, score }; the letter and points are computed by the server.
export default function RecordGradeModal({ visible, onClose, enrollments, grades, onRecorded, initial }) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [students, setStudents] = useState(null)
  const [studentsError, setStudentsError] = useState(null)
  const [studentId, setStudentId] = useState(initial?.studentId ?? null)
  const [term, setTerm] = useState(initial?.term ?? null)
  const [enrollmentId, setEnrollmentId] = useState(initial?.id ?? null)
  const [scoreText, setScoreText] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const scrollRef = useRef(null)

  // Android draws this modal edge-to-edge, so the window is not resized for the keyboard:
  // lift the sheet by the keyboard height so the score field and the button stay visible.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      // Distance from the keyboard's top edge to the bottom of the screen, navigation bar included.
      const lift = Dimensions.get('screen').height - event.endCoordinates.screenY
      setKeyboardHeight(Math.max(event.endCoordinates.height, lift))
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  // The parent gives this component a new key each time the sheet opens, so the form state above
  // starts empty; only the student list needs loading here.
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    api.students()
      .then((list) => { if (!cancelled) { setStudents(list); setStudentsError(null) } })
      .catch((error) => {
        if (!cancelled && error.status !== 401) setStudentsError(error.message || 'Could not load students.')
      })
    return () => { cancelled = true }
  }, [visible])

  const approved = useMemo(
    () => (enrollments || []).filter((item) => item.status === 'approved'),
    [enrollments],
  )
  const gradeByEnrollment = useMemo(() => {
    const map = new Map()
    for (const grade of grades || []) map.set(grade.enrollmentId, grade)
    return map
  }, [grades])

  const terms = useMemo(() => {
    const list = approved.filter((item) => item.studentId === studentId).map((item) => item.term)
    return [...new Set(list)].sort().reverse()
  }, [approved, studentId])

  const courseOptions = useMemo(
    () => approved.filter((item) => item.studentId === studentId && item.term === term),
    [approved, studentId, term],
  )

  const selectedStudent = students?.find((item) => item.studentId === studentId) ?? null
  const selectedCourse = courseOptions.find((item) => item.id === enrollmentId) ?? null
  const score = parseScore(scoreText)
  const preview = score === null ? null : previewGrade(score)

  function chooseStudent(id) {
    const studentTerms = [...new Set(approved.filter((item) => item.studentId === id).map((item) => item.term))]
      .sort().reverse()
    setStudentId(id)
    setTerm(studentTerms[0] ?? null)
    setEnrollmentId(null)
    setErrors({})
    setSubmitError(null)
  }

  function chooseTerm(value) {
    setTerm(value)
    setEnrollmentId(null)
    setErrors({})
  }

  function chooseCourse(item) {
    if (gradeByEnrollment.has(item.id)) {
      setErrors({ course: 'This course already has a grade for this student and term.' })
      return
    }
    setEnrollmentId(item.id)
    setErrors({})
    setSubmitError(null)
  }

  function validate() {
    const next = {}
    if (!studentId) next.student = 'Select a student.'
    else if (!enrollmentId) next.course = 'Select an approved course.'
    if (scoreText.trim() === '') next.score = 'Score is required.'
    else if (score === null) next.score = 'Score must be a number from 0 to 100, with at most 2 decimals.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (busy || !validate()) return
    setBusy(true)
    setSubmitError(null)
    try {
      const grade = await api.createGrade(enrollmentId, score)
      onRecorded?.(grade)
      onClose()
    } catch (error) {
      // 401 is handled globally (back to login). 409 = grade already exists or enrollment not approved.
      if (error.status !== 401) setSubmitError(error.message || 'Unable to record the grade. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const close = () => { if (!busy) onClose() }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close grade entry" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                maxHeight: (height - keyboardHeight) * 0.92,
                marginBottom: keyboardHeight,
                paddingBottom: keyboardHeight ? spacing.sm : Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Record Grade</Text>
                <Text style={styles.subtitle}>
                  Enter a raw score for an approved enrollment. The letter grade and points are calculated by the server.
                </Text>
              </View>
              <Pressable
                onPress={close}
                hitSlop={12}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Student */}
              <Field number={1} label="Select Student" error={errors.student}>
                {studentsError ? (
                  <Text style={styles.errorText}>{studentsError}</Text>
                ) : !students ? (
                  <ActivityIndicator color={colors.primary} style={styles.loader} />
                ) : (
                  students.map((student) => {
                    const own = approved.filter((item) => item.studentId === student.studentId)
                    const ungraded = own.filter((item) => !gradeByEnrollment.has(item.id)).length
                    return (
                      <OptionRow
                        key={student.studentId}
                        selected={student.studentId === studentId}
                        onPress={() => chooseStudent(student.studentId)}
                        title={student.name}
                        detail={`${student.studentId} · ${student.program}`}
                        note={own.length ? `${ungraded} of ${own.length} approved courses not graded` : 'No approved courses'}
                      />
                    )
                  })
                )}
              </Field>

              {/* 2. Term */}
              {studentId ? (
                <Field number={2} label="Academic Term">
                  {terms.length ? (
                    <View style={styles.chips}>
                      {terms.map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => chooseTerm(value)}
                          style={[styles.chip, value === term && styles.chipActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: value === term }}
                        >
                          <Text style={[styles.chipText, value === term && styles.chipTextActive]}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.hint}>This student has no approved courses yet.</Text>
                  )}
                </Field>
              ) : null}

              {/* 3. Course */}
              {studentId && term ? (
                <Field number={3} label="Select Course" error={errors.course}>
                  {courseOptions.map((item) => {
                    const existing = gradeByEnrollment.get(item.id)
                    return (
                      <OptionRow
                        key={item.id}
                        selected={item.id === enrollmentId}
                        disabled={Boolean(existing)}
                        onPress={() => chooseCourse(item)}
                        title={`${item.courseCode} — ${item.courseTitle}`}
                        detail={`${item.credits} SKS · Term ${item.term}`}
                        note={existing ? `Already graded: ${existing.letter} (score ${existing.score})` : 'Approved · not graded yet'}
                      />
                    )
                  })}
                </Field>
              ) : null}

              {/* 4. Score */}
              <Field number={2 + (studentId ? 1 : 0) + (studentId && term ? 1 : 0)} label="Raw Score (0–100)" error={errors.score}>
                <View style={[styles.inputWrap, errors.score && styles.inputWrapError]}>
                  <TextInput
                    value={scoreText}
                    onChangeText={(text) => { setScoreText(text); setErrors((prev) => ({ ...prev, score: undefined })) }}
                    placeholder="e.g. 88"
                    placeholderTextColor={colors.mutedLight}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    style={styles.input}
                    accessibilityLabel="Raw score from 0 to 100"
                  />
                  <Text style={styles.inputSuffix}>/ 100</Text>
                </View>
                {preview ? (
                  <View style={styles.preview}>
                    <Text style={styles.previewLetter}>{preview.letter}</Text>
                    <Text style={styles.previewText}>{preview.points.toFixed(1)} grade points (preview)</Text>
                  </View>
                ) : null}
              </Field>

              {selectedStudent && selectedCourse ? (
                <View style={styles.summary}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.summaryText}>
                    {selectedStudent.name} · {selectedCourse.courseCode} · {selectedCourse.term}
                  </Text>
                </View>
              ) : null}

              {submitError ? (
                <View style={styles.submitError} accessibilityRole="alert">
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <PrimaryButton
                title={busy ? 'Recording grade…' : 'Record Grade'}
                variant="gradient"
                busy={busy}
                onPress={submit}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

function Field({ number, label, error, children }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <View style={styles.stepDot}><Text style={styles.stepDotText}>{number}</Text></View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldBody}>{children}</View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

function OptionRow({ title, detail, note, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Ionicons
        name={disabled ? 'lock-closed-outline' : selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={disabled ? colors.mutedLight : selected ? colors.primary : colors.muted}
      />
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, disabled && styles.optionTitleDisabled]} numberOfLines={2}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
        {note ? <Text style={[styles.optionNote, disabled && styles.optionNoteDisabled]}>{note}</Text> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  avoider: { width: '100%' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    ...shadow.md,
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textSecondary, lineHeight: 18 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  fieldLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  fieldBody: { gap: spacing.sm },
  hint: { fontSize: font.small, color: colors.muted },
  loader: { paddingVertical: spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTap,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  optionSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  optionDisabled: { backgroundColor: colors.surfaceHover },
  optionPressed: { opacity: 0.85 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  optionTitleDisabled: { color: colors.muted },
  optionDetail: { fontSize: font.small, color: colors.textSecondary },
  optionNote: { fontSize: 12, fontWeight: '600', color: colors.success },
  optionNoteDisabled: { color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: '#ffffff' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', minHeight: minTap + 4,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md,
  },
  inputWrapError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 10 },
  inputSuffix: { fontSize: font.body, color: colors.muted, fontWeight: '600' },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryMuted,
    borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  previewLetter: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark },
  previewText: { fontSize: font.small, color: colors.primaryDark, fontWeight: '600' },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.primaryMuted,
  },
  summaryText: { flex: 1, fontSize: font.small, color: colors.primaryDark, fontWeight: '600' },
  errorText: { fontSize: font.small, color: colors.danger, fontWeight: '600' },
  submitError: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.dangerSoft,
    borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: radii.md, padding: spacing.sm,
  },
  submitErrorText: { flex: 1, fontSize: font.small, color: colors.danger, fontWeight: '600' },
  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
})
