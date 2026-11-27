import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
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
import PrimaryButton from '../../components/PrimaryButton'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../../theme'

const workloads = [
  { value: 'light', label: 'Light' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'heavy', label: 'Heavy' },
]

function friendlyAiError(error) {
  if (error?.code === 'AI_TIMEOUT' || error?.code === 'NETWORK') {
    return 'The AI took too long to answer or could not be reached. Please try again.'
  }
  if (error?.code === 'AI_UNAVAILABLE') {
    return 'The AI service is not configured on the server right now. The rest of the portal still works.'
  }
  if (error?.code === 'AI_RATE_LIMITED') return 'The AI service is busy. Please wait a minute and try again.'
  if (error?.code === 'AI_FAILED' || error?.code === 'AI_BAD_RESPONSE') {
    return 'The AI service returned an unexpected answer. Please try again shortly.'
  }
  return error?.message || 'Unable to get course recommendations right now.'
}

function AiBadge() {
  return (
    <View style={styles.aiBadge}>
      <Ionicons name="sparkles" size={11} color={colors.purple} />
      <Text style={styles.aiBadgeText}>AI-generated</Text>
    </View>
  )
}

function Field({ label, required, error, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedLight}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, error && styles.inputError]}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// Student AI screen: calls POST /api/ai/course-recommendations (student-only). The answers are the
// only thing sent; the server adds the student's history and returns 0–3 open catalog courses.
export default function RecommendScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isStudent = user?.role === 'client'

  const [careerGoal, setCareerGoal] = useState('')
  const [interests, setInterests] = useState('')
  const [skills, setSkills] = useState('')
  const [workload, setWorkload] = useState('balanced')
  const [fieldError, setFieldError] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!isStudent || busy) return
    if (!careerGoal.trim()) {
      setFieldError('Tell us which career you are interested in.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.aiCourseRecommendations({
        careerGoal: careerGoal.trim(),
        interests: interests.trim(),
        skills: skills.trim(),
        workload,
      })
      setResult(data)
    } catch (err) {
      if (err.status !== 401) setError(friendlyAiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadow.glow, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <View style={styles.waveOverlay} />
          <View style={styles.heroPill}>
            <Ionicons name="sparkles" size={13} color="#e9d5ff" />
            <Text style={styles.heroPillText}>AI Assistant</Text>
          </View>
          <Text style={styles.heroTitle}>Course Recommendation</Text>
          <Text style={styles.heroSubtitle}>
            Tell the AI about your career plans and it will suggest up to three open courses that fit you.
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {!isStudent ? (
            <View style={[styles.card, shadow.sm]}>
              <Text style={styles.restrictedTitle}>Student Access Only</Text>
              <Text style={styles.restrictedBody}>
                Course recommendations are based on a student&apos;s own records.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.card, shadow.sm]}>
                <Text style={styles.sectionLabel}>About You</Text>
                <Field
                  label="Which career are you interested in?"
                  required
                  value={careerGoal}
                  onChangeText={(value) => {
                    setCareerGoal(value)
                    setFieldError(null)
                  }}
                  placeholder="e.g. Data engineer, AI researcher"
                  maxLength={120}
                  editable={!busy}
                  error={fieldError}
                  returnKeyType="next"
                />
                <Field
                  label="Topics or subjects you enjoy"
                  value={interests}
                  onChangeText={setInterests}
                  placeholder="e.g. math, databases, web apps"
                  maxLength={300}
                  editable={!busy}
                  multiline
                />
                <Field
                  label="Skills you want to build"
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="e.g. problem solving, SQL"
                  maxLength={300}
                  editable={!busy}
                  multiline
                />

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Preferred workload</Text>
                  <View style={styles.chipRow}>
                    {workloads.map((option) => {
                      const active = workload === option.value
                      return (
                        <Pressable
                          key={option.value}
                          disabled={busy}
                          onPress={() => setWorkload(option.value)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>

                <PrimaryButton
                  variant="gradient"
                  title={busy ? 'Finding courses…' : 'Get Recommendations'}
                  onPress={handleSubmit}
                  busy={busy}
                  disabled={busy}
                  icon={<Ionicons name="sparkles" size={18} color="#ffffff" />}
                />

                {busy ? (
                  <View style={styles.loadingBanner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>
                      Comparing your goals and past grades with the open courses. This can take up to 25 seconds…
                    </Text>
                  </View>
                ) : null}
              </View>

              {error ? (
                <View style={styles.errorCard} accessibilityLiveRegion="polite">
                  <View style={styles.errorTop}>
                    <Ionicons name="alert-circle" size={20} color={colors.danger} />
                    <Text style={styles.errorTitle}>Recommendation Unavailable</Text>
                  </View>
                  <Text style={styles.errorBody}>{error}</Text>
                  <PrimaryButton title="Try Again" variant="outline" onPress={handleSubmit} busy={busy} />
                </View>
              ) : null}

              {result ? (
                <View style={styles.resultsWrap}>
                  <View style={[styles.summaryCard, shadow.sm]}>
                    <View style={styles.summaryTop}>
                      <Text style={styles.summaryTitle}>Summary</Text>
                      {result.aiGenerated ? <AiBadge /> : null}
                    </View>
                    <Text style={styles.summaryBody}>{result.summary}</Text>
                  </View>

                  <Text style={styles.sectionHeading}>
                    Recommended Courses ({result.recommendations.length})
                  </Text>

                  {result.recommendations.length === 0 ? (
                    <View style={[styles.emptyCard, shadow.sm]}>
                      <Text style={styles.emptyTitle}>No matching course right now</Text>
                      <Text style={styles.emptyText}>
                        None of the open courses fits your answers. Try describing your goals differently.
                      </Text>
                    </View>
                  ) : (
                    result.recommendations.map((course, index) => (
                      <View key={course.courseId} style={[styles.courseCard, shadow.sm]}>
                        <View style={styles.courseTop}>
                          <View style={styles.courseIdentity}>
                            <Text style={styles.courseTitle}>{course.title}</Text>
                            <Text style={styles.courseMeta}>
                              {course.code} · {course.credits} credits · Term {course.term}
                            </Text>
                          </View>
                          <View style={styles.rankPill}>
                            <Text style={styles.rankPillText}>#{index + 1}</Text>
                          </View>
                        </View>
                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHead}>
                            <Text style={styles.aiSectionLabel}>Why this course</Text>
                            <AiBadge />
                          </View>
                          <Text style={styles.aiSectionText}>{course.reason}</Text>
                        </View>
                        <PrimaryButton
                          title="Request Enrollment"
                          variant="outline"
                          onPress={() =>
                            router.push({ pathname: '/enroll', params: { courseId: course.courseId } })
                          }
                        />
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    gap: 6,
  },
  waveOverlay: {
    position: 'absolute',
    left: -60,
    right: -60,
    bottom: -90,
    height: 180,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(233, 213, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  heroPillText: { color: '#f3e8ff', fontSize: font.xs, fontWeight: '700' },
  heroTitle: { fontSize: 23, fontWeight: '800', color: '#ffffff', letterSpacing: -0.4 },
  heroSubtitle: { fontSize: font.small, color: '#cbd5e1', lineHeight: 19 },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.text },
  required: { color: colors.danger },
  input: {
    minHeight: minTap,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: font.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorText: { fontSize: font.small, color: colors.danger },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: minTap,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: font.small, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: colors.primaryDark },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: spacing.sm,
  },
  loadingText: { flex: 1, fontSize: font.xs, color: colors.primaryDark, lineHeight: 17, fontWeight: '600' },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: font.body, fontWeight: '800', color: colors.danger },
  errorBody: { fontSize: font.small, color: colors.textSecondary, lineHeight: 19 },
  resultsWrap: { gap: spacing.md },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: spacing.md,
    gap: 8,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summaryTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  summaryBody: { fontSize: font.small, color: colors.textSecondary, lineHeight: 20 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purpleSoft,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: colors.purple },
  sectionHeading: { fontSize: font.title, fontWeight: '800', color: colors.text, paddingHorizontal: 2 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  courseTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  courseIdentity: { flex: 1, gap: 2 },
  courseTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  courseMeta: { fontSize: font.xs, color: colors.muted, fontWeight: '600' },
  rankPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  rankPillText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  aiSection: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: spacing.sm,
    gap: 6,
  },
  aiSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  aiSectionLabel: { fontSize: font.xs, fontWeight: '800', color: colors.textSecondary },
  aiSectionText: { fontSize: font.small, color: colors.text, lineHeight: 19 },
  restrictedTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, textAlign: 'center' },
  restrictedBody: { fontSize: font.small, color: colors.muted, textAlign: 'center', lineHeight: 20 },
})
