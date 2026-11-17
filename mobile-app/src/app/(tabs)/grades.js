import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ListRow from '../../components/ListRow'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, gradients, radii, shadow, spacing } from '../../theme'

export default function GradesScreen() {
  const { user, gpa, refreshMe } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'administrator'
  const [activeTab, setActiveTab] = useState('courses') // 'courses' | 'grades'

  const { items: grades, error, refreshing, reload, refresh } = useApiList(api.grades)
  const { refresh: refreshEnrollments } = useApiList(api.enrollments)

  const onRefresh = async () => {
    await Promise.allSettled([refresh(), refreshEnrollments(), refreshMe()])
  }

  if (!grades && error) return <ErrorView message={error} onRetry={reload} />
  if (!grades) return <LoadingView label="Loading academic records…" />

  const totalCredits = (grades || []).reduce((s, g) => s + (g.credits || 0), 0)
  const courseCount = grades?.length ?? 0

  return (
    <FlatList
      data={grades}
      keyExtractor={(grade) => String(grade.id)}
      contentContainerStyle={[
        styles.list,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          {/* Top Royal Navy Fluid Header */}
          <LinearGradient
            colors={isAdmin ? gradients.heroAdmin : gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroHeader, shadow.glow]}
          >
            <View style={styles.waveOverlay} />

            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroTitle}>
                  {isAdmin ? 'University Academic Records' : 'Academic Performance'}
                </Text>
                <Text style={styles.heroSemester}>
                  Fall Semester · Academic Term 2024/2025
                </Text>
              </View>

              {/* Clean Quick Pill */}
              <View style={styles.headerQuickPill}>
                <Ionicons name="school-outline" size={13} color="#ffffff" />
                <Text style={styles.headerQuickPillText}>Registrar Verified</Text>
              </View>
            </View>

            {/* Prominent Degree Progress Banner */}
            <View style={styles.prominentCard}>
              <View style={styles.prominentLeft}>
                <Text style={styles.prominentTitle}>Degree Audit & Enrolled Units</Text>
                <Text style={styles.prominentSub}>
                  {courseCount} Enrolled Courses · {totalCredits} SKS Credits
                </Text>
              </View>
              <View style={styles.prominentArrow}>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </View>
            </View>
          </LinearGradient>

          {/* Academic Document Export Card */}
          {!isAdmin ? (
            <View style={[styles.examCard, shadow.sm]}>
              <View style={styles.examTopRow}>
                <View style={styles.examTextWrap}>
                  <Text style={styles.examTitle}>Examination & Term Schedule</Text>
                  <Text style={styles.examSub}>
                    Midterm examination verifications assigned · All course schedules active
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>

              <View style={styles.examDivider} />

              <Pressable style={styles.ksmButton}>
                <Ionicons name="document-text-outline" size={16} color="#1d4ed8" />
                <Text style={styles.ksmButtonText}>
                  Export Official Academic Record (PDF)
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* 2-Segmented Modern Navigation Toggle */}
          {!isAdmin ? (
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleTab,
                  activeTab === 'courses' && styles.toggleTabActive,
                ]}
                onPress={() => setActiveTab('courses')}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    activeTab === 'courses' && styles.toggleTabTextActive,
                  ]}
                >
                  Current Courses
                </Text>
                <Text
                  style={[
                    styles.toggleTabCount,
                    activeTab === 'courses' && styles.toggleTabCountActive,
                  ]}
                >
                  {courseCount} Active
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleTab,
                  activeTab === 'grades' && styles.toggleTabActive,
                ]}
                onPress={() => setActiveTab('grades')}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    activeTab === 'grades' && styles.toggleTabTextActive,
                  ]}
                >
                  Grade Transcript
                </Text>
                <Text
                  style={[
                    styles.toggleTabCount,
                    activeTab === 'grades' && styles.toggleTabCountActive,
                  ]}
                >
                  GPA {gpa != null ? (typeof gpa === 'number' ? gpa.toFixed(2) : gpa) : '3.60'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* If Grade Transcript is selected: Render GPA Hero Card */}
          {activeTab === 'grades' && !isAdmin && gpa != null ? (
            <GpaCard gpa={gpa} totalCredits={totalCredits} count={courseCount} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyView
          title="No records found"
          message="Courses and official grades recorded for this term will appear here."
        />
      }
      renderItem={({ item }) => {
        if (activeTab === 'courses' && !isAdmin) {
          // Sleek original Course Card
          return (
            <View style={[styles.courseCard, shadow.sm]}>
              <View style={styles.courseHeader}>
                <View style={styles.courseTitleWrap}>
                  <Text style={styles.courseTitleText}>
                    {item.courseCode} · {item.courseTitle}
                  </Text>
                  <Text style={styles.courseInstructorText}>
                    {item.instructor || 'Faculty Professor'}
                  </Text>
                </View>
                <View style={styles.courseCreditsBadge}>
                  <Text style={styles.courseCreditsText}>{item.credits} SKS</Text>
                </View>
              </View>

              <View style={styles.courseMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Attendance</Text>
                  <Text style={styles.metricValue}>14 of 14 (100%)</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Absence Quota</Text>
                  <Text style={styles.metricValueGood}>0 Used (3 Max)</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Schedule</Text>
                  <Text style={styles.metricValueSchedule}>Mon 08:00 · F802</Text>
                </View>
              </View>
            </View>
          )
        }

        // Render Grade Row with Letter Badge
        return (
          <ListRow
            badgeText={item.courseCode}
            title={item.courseTitle}
            subtitle={isAdmin ? `${item.studentName} (${item.studentId})` : `Term ${item.term}`}
            meta={`${item.credits} Credits · Raw Score: ${item.score}`}
            right={
              <View style={styles.gradeBadge}>
                <Text style={styles.letter}>{item.letter ?? '-'}</Text>
                {item.points != null ? (
                  <Text style={styles.points}>{Number(item.points).toFixed(1)} pts</Text>
                ) : null}
              </View>
            }
          />
        )
      }}
      ListFooterComponent={
        !isAdmin ? (
          <View style={styles.footerLinksWrap}>
            <Pressable style={[styles.footerLinkCard, shadow.sm]}>
              <View style={styles.footerLinkLeft}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.footerLinkText}>Academic Calendar & Deadlines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>

            <Pressable style={[styles.footerLinkCard, shadow.sm]}>
              <View style={styles.footerLinkLeft}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.footerLinkText}>Faculty Advising & Office Hours</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ) : null
      }
    />
  )
}

function GpaCard({ gpa, totalCredits, count }) {
  const numGpa = typeof gpa === 'number' ? gpa : parseFloat(gpa) || 0
  const value = typeof gpa === 'number' ? gpa.toFixed(2) : String(gpa)

  const standing =
    numGpa >= 3.5
      ? "Dean's List · First Class Standing"
      : numGpa >= 3.0
        ? 'Good Academic Standing'
        : 'Satisfactory Standing'

  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gpaHero, shadow.glow]}
    >
      <View style={styles.waveOverlay} />

      <View style={styles.gpaTop}>
        <View style={styles.standingBadge}>
          <Ionicons name="ribbon-outline" size={12} color="#fcd34d" />
          <Text style={styles.standingText}>{standing}</Text>
        </View>
        <Text style={styles.termLabel}>Fall Term 2024/2025</Text>
      </View>

      <View style={styles.gpaMainRow}>
        <View style={styles.gpaLeft}>
          <Text style={styles.gpaHeroLabel}>Cumulative GPA</Text>
          <Text style={styles.gpaHeroSub}>Credit-weighted calculation</Text>
          <View style={styles.gpaPills}>
            <View style={styles.miniPill}>
              <Ionicons name="book-outline" size={12} color="#93c5fd" />
              <Text style={styles.miniPillText}>{totalCredits} Credits</Text>
            </View>
            <View style={styles.miniPill}>
              <Ionicons name="checkmark-done-outline" size={12} color="#93c5fd" />
              <Text style={styles.miniPillText}>{count} Courses</Text>
            </View>
          </View>
        </View>

        <View style={styles.gpaRight}>
          <Text style={styles.gpaValue}>{value}</Text>
          <Text style={styles.gpaScale}>out of 4.00</Text>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  headerWrap: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  heroHeader: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    gap: spacing.md,
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
    backgroundColor: 'transparent',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSemester: {
    fontSize: font.xs,
    color: '#e0e7ff',
    marginTop: 2,
  },
  headerQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerQuickPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  prominentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prominentLeft: {
    gap: 3,
  },
  prominentTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  prominentSub: {
    color: '#bfdbfe',
    fontSize: font.xs,
    fontWeight: '600',
  },
  prominentArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  examTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examTextWrap: {
    gap: 2,
    flex: 1,
  },
  examTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  examSub: {
    fontSize: font.xs,
    color: colors.muted,
  },
  examDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  ksmButton: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ksmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toggleTab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  toggleTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  toggleTabTextActive: {
    color: '#ffffff',
  },
  toggleTabCount: {
    fontSize: font.xs,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleTabCountActive: {
    color: '#bfdbfe',
  },
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseTitleWrap: {
    flex: 1,
    gap: 2,
  },
  courseTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  courseInstructorText: {
    fontSize: font.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  courseCreditsBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  courseCreditsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  courseMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.borderLight,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  metricValueGood: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  metricValueSchedule: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  gpaHero: {
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    gap: spacing.sm,
  },
  gpaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  standingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  standingText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  termLabel: {
    color: '#bfdbfe',
    fontSize: font.xs,
    fontWeight: '600',
  },
  gpaMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpaLeft: {
    gap: 2,
  },
  gpaHeroLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  gpaHeroSub: {
    color: '#e0e7ff',
    fontSize: font.xs,
  },
  gpaPills: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  miniPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  gpaRight: {
    alignItems: 'flex-end',
  },
  gpaValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 38,
  },
  gpaScale: {
    color: '#bfdbfe',
    fontSize: font.xs,
  },
  gradeBadge: {
    alignItems: 'flex-end',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  letter: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.primary,
  },
  points: {
    fontSize: font.xs,
    color: colors.muted,
  },
  footerLinksWrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footerLinkCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
})
