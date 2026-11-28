import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../components/PrimaryButton'
import { ErrorView, LoadingView } from '../components/StateView'
import { api } from '../lib/api'
import { useApiList } from '../lib/useApiList'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../theme'

// One screen, one field: which course. The API accepts only { courseId }; every other meaning
// of "enrollment" (student, status, date) is decided by the server. Rules this screen keeps (D5):
// 48 pt targets, the submit button above the safe-area inset so the thumb reaches it, the keyboard
// never covering a field, errors under the field instead of in an Alert, and a busy state so one
// tap sends exactly one request.
export default function EnrollScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const preselectedId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId

  const coursesState = useApiList(api.courses)
  const enrollmentsState = useApiList(api.enrollments)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(preselectedId ?? null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  const courses = coursesState.items
  const enrollments = enrollmentsState.items

  // A pending or approved request blocks a new one; after a rejection the student may ask again
  // (the API reopens the same row as pending).
  const existingByCourse = useMemo(() => {
    const map = new Map()
    for (const enrollment of enrollments ?? []) map.set(enrollment.courseId, enrollment.status)
    return map
  }, [enrollments])

  function availability(course) {
    const existing = existingByCourse.get(course.id)
    if (existing === 'approved') {
      return { label: 'Enrolled', reason: 'you are already enrolled in this course' }
    }
    if (existing === 'pending') {
      return { label: 'Requested', reason: 'you already have a pending request for this course' }
    }
    if (course.isOpen === false) {
      return { label: 'Closed', reason: 'this course is closed for enrollment' }
    }
    if (course.enrolled >= course.capacity) {
      return { label: 'Full', reason: 'this course is full' }
    }
    return null
  }

  const filtered = useMemo(() => {
    if (!courses) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return courses
    return courses.filter((course) => [course.code, course.title, course.instructor]
      .some((value) => (value || '').toLowerCase().includes(needle)))
  }, [courses, query])

  const selected = courses?.find((course) => course.id === selectedId) ?? null
  const selectedBlocked = selected ? availability(selected) : null
  const canSubmit = Boolean(selected) && !selectedBlocked && !busy

  function choose(course) {
    const blocked = availability(course)
    if (blocked) {
      setError(`${course.code}: ${blocked.reason}.`)
      return
    }
    setSelectedId(course.id)
    setError(null)
  }

  // The keyboard's Go key behaves like tapping the single matching course, so the flow is
  // type a code → Go → Send, without reaching for the list.
  function handleQuerySubmit() {
    const needle = query.trim().toUpperCase()
    if (!needle) {
      setError('Type a course code first, for example CS201.')
      return
    }
    const matches = (courses ?? []).filter(
      (course) => course.code.toUpperCase() === needle,
    )
    const course = matches[0] ?? (filtered.length === 1 ? filtered[0] : null)
    if (!course) {
      setError(`No course matches "${query.trim()}". Check the code and try again.`)
      return
    }
    choose(course)
  }

  async function submit() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const enrollment = await api.createEnrollment(selected.id)
      setCreated(enrollment)
    } catch (failure) {
      // A 401 is handled by api.js (session cleared, router shows login), so only the
      // actionable answers are shown here: duplicate request, full course, validation.
      if (failure.status !== 401) {
        setError(failure.message || 'The request could not be sent. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <View style={[styles.success, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={34} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Request sent</Text>
        <Text style={styles.successCourse}>{created.courseCode} · {created.courseTitle}</Text>
        <Text style={styles.successMeta}>
          {created.credits} credits · {created.term} · status {created.status}
        </Text>
        <Text style={styles.successHint}>
          Only one request exists for this course. The registrar approves or rejects it, and
          the answer appears in My Enrollments.
        </Text>
        <View style={[styles.successActions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <PrimaryButton
            title="View my enrollments"
            onPress={() => router.replace('/(tabs)/enrollments')}
          />
          <PrimaryButton title="Done" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    )
  }

  if (!courses && coursesState.error) {
    return <ErrorView message={coursesState.error} onRetry={coursesState.reload} />
  }
  if (!courses) return <LoadingView label="Loading the course catalog…" />

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBarText}>
          <Text style={styles.topTitle}>Enroll in a course</Text>
          <Text style={styles.topSubtitle}>One request per course · the registrar decides</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close the enrollment form"
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.label}>Course code or title</Text>
        <View style={[styles.inputRow, error ? styles.inputRowError : null, shadow.sm]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={(value) => {
              setQuery(value)
              setError(null)
            }}
            placeholder="CS201 or Data Structures"
            placeholderTextColor={colors.mutedLight}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleQuerySubmit}
            accessibilityLabel="Course code or title"
            maxLength={60}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery('')
                setError(null)
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear the search"
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Type a code and press Go, or pick a course below.</Text>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No course matches</Text>
            <Text style={styles.emptyText}>
              Nothing in the catalog matches "{query.trim()}".
            </Text>
          </View>
        ) : (
          filtered.map((course) => {
            const blocked = availability(course)
            const isSelected = course.id === selectedId
            return (
              <Pressable
                key={course.id}
                onPress={() => choose(course)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityHint={blocked ? blocked.reason : 'Selects this course'}
                style={({ pressed }) => [
                  styles.option,
                  isSelected ? styles.optionSelected : null,
                  blocked ? styles.optionBlocked : null,
                  pressed ? styles.optionPressed : null,
                ]}
              >
                <View style={styles.optionBody}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionCode}>{course.code}</Text>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                  </View>
                  <Text style={styles.optionMeta}>
                    {course.credits} credits · {course.term} · {course.instructor}
                  </Text>
                  <Text style={styles.optionSeats}>
                    {Math.max(course.capacity - course.enrolled, 0)} of {course.capacity} seats left
                  </Text>
                </View>
                {blocked ? (
                  <Text style={styles.optionBlockedLabel}>{blocked.label}</Text>
                ) : isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            )
          })
        )}

        {selected ? (
          <LinearGradient
            colors={gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summary, shadow.sm]}
          >
            <Text style={styles.summaryLabel}>Selected course</Text>
            <Text style={styles.summaryTitle}>{selected.code} · {selected.title}</Text>
            <Text style={styles.summaryMeta}>
              {selected.credits} credits · {selected.term}
            </Text>
            <Text style={styles.summaryMeta}>{selected.instructor}</Text>
            {selectedBlocked ? (
              <Text style={styles.summaryWarning}>{selectedBlocked.reason}</Text>
            ) : null}
          </LinearGradient>
        ) : null}
      </ScrollView>

      {/* Thumb zone: the main action sits above the home indicator, not at the top of the screen. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <PrimaryButton
          title="Send enrollment request"
          onPress={submit}
          busy={busy}
          disabled={!canSubmit}
        />
        <Text style={styles.footerHint}>
          {selected
            ? selectedBlocked
              ? 'This course cannot be requested. Choose another one.'
              : 'The request is created as pending.'
            : 'Choose a course to continue.'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarText: { flex: 1, gap: 2 },
  topTitle: { fontSize: font.title, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  topSubtitle: { fontSize: font.xs, color: colors.muted },
  closeButton: {
    width: minTap,
    height: minTap,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  label: { fontSize: font.xs, fontWeight: '700', color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTap,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRowError: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSoft },
  input: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: spacing.sm },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  errorText: { flex: 1, fontSize: font.small, color: colors.danger, lineHeight: 18 },
  hint: { fontSize: font.xs, color: colors.mutedLight },
  emptyBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTap,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionBlocked: { backgroundColor: colors.surfaceTint, borderColor: colors.borderLight },
  optionPressed: { opacity: 0.9 },
  optionBody: { flex: 1, gap: 2 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionCode: { fontSize: font.small, fontWeight: '800', color: colors.primaryDark },
  optionTitle: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.text },
  optionMeta: { fontSize: font.xs, color: colors.muted },
  optionSeats: { fontSize: font.xs, color: colors.mutedLight, fontWeight: '600' },
  optionBlockedLabel: { fontSize: font.xs, fontWeight: '700', color: colors.muted },
  summary: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    gap: 2,
  },
  summaryLabel: { fontSize: font.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, marginTop: 2 },
  summaryMeta: { fontSize: font.xs, color: colors.muted },
  summaryWarning: { fontSize: font.xs, fontWeight: '700', color: colors.danger, marginTop: 4 },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: { fontSize: font.xs, color: colors.muted, textAlign: 'center' },
  success: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    marginBottom: spacing.sm,
  },
  successTitle: { fontSize: font.heading, fontWeight: '800', color: colors.text },
  successCourse: { fontSize: font.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  successMeta: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  successHint: {
    fontSize: font.small,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  successActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: 'auto', paddingTop: spacing.xl },
})
