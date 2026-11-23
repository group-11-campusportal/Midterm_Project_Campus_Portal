import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../../components/PrimaryButton'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../../theme'

function friendlyAiError(error) {
  if (!error) return 'Unable to generate the AI report right now. Please try again.'
  if (error.code === 'AI_TIMEOUT' || error.code === 'NETWORK') {
    return 'The AI advisor took too long to respond or could not be reached. Your student records are safe — please try again.'
  }
  if (error.code === 'AI_UNAVAILABLE') {
    return 'The AI advisor is currently not configured on the server. The rest of the portal still works normally.'
  }
  if (error.code === 'AI_RATE_LIMITED') {
    return 'The AI service is temporarily busy. Please wait a minute and try again.'
  }
  if (error.code === 'AI_FAILED' || error.code === 'AI_BAD_RESPONSE') {
    return 'The AI service returned an unexpected response. Please try again shortly.'
  }
  return error.message || 'Unable to generate the AI report right now. Please try again.'
}

function riskPalette(level) {
  if (level === 'high') {
    return { bg: colors.dangerSoft, border: colors.dangerBorder, text: colors.danger }
  }
  if (level === 'medium') {
    return { bg: colors.warningSoft, border: colors.warningBorder, text: colors.warning }
  }
  return { bg: colors.primarySoft, border: colors.primaryMuted, text: colors.primaryDark }
}

function AiBadge() {
  return (
    <View style={styles.aiBadge}>
      <Ionicons name="sparkles" size={11} color={colors.purple} />
      <Text style={styles.aiBadgeText}>AI-generated</Text>
    </View>
  )
}

// Mobile AI Advisor screen (UC-8): calls POST /api/ai/at-risk-summary (admin-only).
// Every AI-authored field (overallSummary, reason, recommendation) is explicitly labelled
// "AI-generated" and any LLM failure displays a friendly, retryable error banner.
export default function AdvisorScreen() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'administrator'

  const { items: courses } = useApiList(api.courses)

  const terms = useMemo(() => {
    const list = Array.from(new Set((courses ?? []).map((c) => c.term).filter(Boolean)))
    if (!list.includes('2024/2025')) list.unshift('2024/2025')
    return list
  }, [courses])

  const [selectedTerm, setSelectedTerm] = useState('2024/2025')
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    if (!isAdmin || busy) return
    setBusy(true)
    setError(null)
    setReport(null)
    try {
      const data = await api.aiAtRiskSummary(selectedTerm)
      setReport(data)
    } catch (err) {
      if (err.status !== 401) {
        setError(friendlyAiError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <LinearGradient
        colors={gradients.heroAdmin}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hero,
          shadow.glow,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
      >
        <View style={styles.waveOverlay} />
        <View style={styles.heroPill}>
          <Ionicons name="sparkles" size={13} color="#e9d5ff" />
          <Text style={styles.heroPillText}>AI Academic Advisor · UC-8</Text>
        </View>
        <Text style={styles.heroTitle}>At-Risk Student Detection</Text>
        <Text style={styles.heroSubtitle}>
          Reviews real database grades and enrollment requests to surface students who may need advising.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {!isAdmin ? (
          <View style={[styles.card, shadow.sm]}>
            <View style={styles.restrictedIcon}>
              <Ionicons name="shield-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.restrictedTitle}>Administrator Access Required</Text>
            <Text style={styles.restrictedBody}>
              The AI Academic Advisor analyzes institution-wide records and is available only to
              registrar administrators.
            </Text>
          </View>
        ) : (
          <>
            {/* Term Selection & Run Control */}
            <View style={[styles.card, shadow.sm]}>
              <Text style={styles.sectionLabel}>Select Academic Term</Text>
              <View style={styles.termRow}>
                {terms.map((term) => {
                  const active = selectedTerm === term
                  return (
                    <Pressable
                      key={term}
                      disabled={busy}
                      onPress={() => setSelectedTerm(term)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.termChip, active && styles.termChipActive]}
                    >
                      <Text style={[styles.termChipText, active && styles.termChipTextActive]}>
                        Term {term}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              <PrimaryButton
                variant="gradient"
                title={busy ? 'Analyzing student records…' : 'Generate AI Risk Report'}
                onPress={handleGenerate}
                busy={busy}
                disabled={busy}
                icon={<Ionicons name="sparkles" size={18} color="#ffffff" />}
              />

              {busy ? (
                <View style={styles.loadingBanner}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>
                    Evaluating GPA, grades, and enrollments for term {selectedTerm}. This can take
                    up to 25 seconds…
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Friendly Error Card */}
            {error ? (
              <View style={styles.errorCard} accessibilityLiveRegion="polite">
                <View style={styles.errorTop}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                  <Text style={styles.errorTitle}>AI Analysis Unavailable</Text>
                </View>
                <Text style={styles.errorBody}>{error}</Text>
                <PrimaryButton
                  title="Retry Analysis"
                  variant="outline"
                  onPress={handleGenerate}
                  busy={busy}
                />
              </View>
            ) : null}

            {/* AI Report Results */}
            {report ? (
              <View style={styles.resultsWrap}>
                {/* Executive Summary Card */}
                <View style={[styles.summaryCard, shadow.sm]}>
                  <View style={styles.summaryTop}>
                    <Text style={styles.summaryTitle}>Executive Summary</Text>
                    {report.aiGenerated ? <AiBadge /> : null}
                  </View>
                  <Text style={styles.summaryBody}>{report.overallSummary}</Text>
                  <Text style={styles.summaryMeta}>
                    Term {report.term} · Generated{' '}
                    {new Date(report.generatedAt).toLocaleString()}
                  </Text>
                </View>

                {/* Flagged Students List */}
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionHeading}>
                    Flagged Students ({report.atRiskStudents?.length ?? 0})
                  </Text>
                  <Text style={styles.sectionSub}>High → Low risk</Text>
                </View>

                {!report.atRiskStudents || report.atRiskStudents.length === 0 ? (
                  <View style={[styles.emptyCard, shadow.sm]}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                    </View>
                    <Text style={styles.emptyTitle}>No Academic Risk Indicators</Text>
                    <Text style={styles.emptyText}>
                      No students were flagged for term {report.term}.
                    </Text>
                  </View>
                ) : (
                  report.atRiskStudents.map((student) => {
                    const palette = riskPalette(student.riskLevel)
                    return (
                      <View
                        key={student.studentId}
                        style={[styles.studentCard, shadow.sm]}
                      >
                        <View style={styles.studentTop}>
                          <View style={styles.studentIdentity}>
                            <Text style={styles.studentName}>{student.studentName}</Text>
                            <Text style={styles.studentId}>
                              {student.studentId} · GPA {Number(student.gpa).toFixed(2)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.riskPill,
                              { backgroundColor: palette.bg, borderColor: palette.border },
                            ]}
                          >
                            <Text style={[styles.riskPillText, { color: palette.text }]}>
                              {student.riskLevel.toUpperCase()} RISK
                            </Text>
                          </View>
                        </View>

                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHead}>
                            <Text style={styles.aiSectionLabel}>Identified Risk Factors</Text>
                            <AiBadge />
                          </View>
                          <Text style={styles.aiSectionText}>{student.reason}</Text>
                        </View>

                        <View style={[styles.aiSection, styles.aiSectionAction]}>
                          <View style={styles.aiSectionHead}>
                            <Text style={styles.aiSectionLabel}>Recommended Advising Action</Text>
                            <AiBadge />
                          </View>
                          <Text style={styles.aiSectionText}>{student.recommendation}</Text>
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
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
  heroPillText: {
    color: '#f3e8ff',
    fontSize: font.xs,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: font.small,
    color: '#cbd5e1',
    lineHeight: 19,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
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
  termRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  termChip: {
    minHeight: minTap,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  termChipText: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.muted,
  },
  termChipTextActive: {
    color: colors.primaryDark,
  },
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
  loadingText: {
    flex: 1,
    fontSize: font.xs,
    color: colors.primaryDark,
    lineHeight: 17,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.danger,
  },
  errorBody: {
    fontSize: font.small,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  resultsWrap: {
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: spacing.md,
    gap: 8,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryTitle: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
  },
  summaryBody: {
    fontSize: font.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  summaryMeta: {
    fontSize: font.xs,
    color: colors.muted,
  },
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
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.purple,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSub: {
    fontSize: font.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: font.small,
    color: colors.muted,
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  studentTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  studentIdentity: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
  },
  studentId: {
    fontSize: font.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  aiSection: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    gap: 6,
  },
  aiSectionAction: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  aiSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  aiSectionLabel: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  aiSectionText: {
    fontSize: font.small,
    color: colors.text,
    lineHeight: 19,
  },
  restrictedIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  restrictedTitle: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  restrictedBody: {
    fontSize: font.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
