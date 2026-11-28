import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBadge } from '../../components/ListRow'
import PrimaryButton from '../../components/PrimaryButton'
import { ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../../theme'

// Course Detail screen: completes the main flow (course list -> course detail -> enroll).
// Fetches live course details from GET /api/courses/:id and checks the student's existing
// enrollment status from GET /api/enrollments.
export default function CourseDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const params = useLocalSearchParams()
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id
  const isStudent = user?.role !== 'administrator'

  const [course, setCourse] = useState(null)
  const [existingEnrollment, setExistingEnrollment] = useState(null)
  const [loading, setLoading] = useState(Boolean(courseId))
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(courseId ? null : 'Course identifier is missing.')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [createdEnrollment, setCreatedEnrollment] = useState(null)

  const loadDetails = useCallback(() => {
    if (!courseId) return Promise.resolve()
    return Promise.all([api.course(courseId), api.enrollments()])
      .then(([courseData, enrollments]) => {
        setCourse(courseData)
        const match = isStudent
          ? (enrollments ?? []).find((item) => item.courseId === courseData.id) ?? null
          : null
        setExistingEnrollment(match)
        setLoadError(null)
      })
      .catch((error) => {
        if (error.status !== 401) {
          setLoadError(error.message || 'Could not load course details.')
        }
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [courseId, isStudent])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  function handleRetry() {
    setLoading(true)
    setLoadError(null)
    loadDetails()
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadDetails()
  }

  async function handleEnroll() {
    if (!course || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const enrollment = await api.createEnrollment(course.id)
      setCreatedEnrollment(enrollment)
      setExistingEnrollment(enrollment)
    } catch (error) {
      if (error.status !== 401) {
        setSubmitError(error.message || 'Enrollment request could not be sent. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !course) {
    return <LoadingView label="Loading course details…" />
  }

  if (loadError && !course) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.errorHeader}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButtonLight}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.errorHeaderTitle}>Course Details</Text>
        </View>
        <ErrorView message={loadError} onRetry={handleRetry} />
      </View>
    )
  }

  if (createdEnrollment) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={34} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Enrollment Request Sent</Text>
        <Text style={styles.successCourse}>
          {createdEnrollment.courseCode} · {createdEnrollment.courseTitle}
        </Text>
        <View style={styles.successBadgeWrap}>
          <StatusBadge status={createdEnrollment.status} />
        </View>
        <Text style={styles.successMeta}>
          {createdEnrollment.credits} credits · Term {createdEnrollment.term} · Submitted {createdEnrollment.enrolledAt}
        </Text>
        <Text style={styles.successHint}>
          Your request is saved on the server and now appears in My Enrollments and on the Web Portal.
          The registrar will approve or reject it.
        </Text>
        <View style={[styles.successActions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <PrimaryButton
            variant="gradient"
            title="View My Enrollments"
            onPress={() => router.replace('/(tabs)/enrollments')}
            icon={<Ionicons name="clipboard-outline" size={18} color="#ffffff" />}
          />
          <PrimaryButton
            title="Back to Course List"
            variant="outline"
            onPress={() => router.back()}
          />
        </View>
      </View>
    )
  }

  const seatsTaken = course?.enrolled ?? 0
  const capacity = course?.capacity ?? 1
  const seatsLeft = Math.max(capacity - seatsTaken, 0)
  const ratio = Math.min(1, Math.max(0, seatsTaken / capacity))
  const isFull = seatsTaken >= capacity

  const existingStatus = existingEnrollment?.status ?? null
  const blockedReason = existingStatus === 'approved'
    ? 'You are already enrolled in this course.'
    : existingStatus === 'pending'
      ? 'You already have a pending enrollment request for this course.'
      : course?.isOpen === false
        ? 'This course is closed for enrollment.'
        : isFull
          ? 'This course has reached maximum capacity.'
          : null

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isStudent ? gradients.hero : gradients.heroAdmin}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            shadow.glow,
            { paddingTop: Math.max(insets.top, 16) + 8 },
          ]}
        >
          <View style={styles.waveOverlay} />

          <View style={styles.navRow}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to course list"
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </Pressable>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{course.code}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{course.title}</Text>
          <Text style={styles.heroSubtitle}>
            {course.instructor} · Academic Term {course.term}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Ionicons name="book-outline" size={14} color="#bfdbfe" />
              <Text style={styles.heroMetaText}>{course.credits} Credits (SKS)</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Ionicons name="people-outline" size={14} color="#bfdbfe" />
              <Text style={styles.heroMetaText}>
                {seatsLeft} of {capacity} seats left
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Current Enrollment Status (if student already requested/enrolled) */}
          {isStudent && existingEnrollment ? (
            <View style={[styles.statusCard, shadow.sm]}>
              <View style={styles.statusCardTop}>
                <Text style={styles.sectionLabel}>Your Enrollment Status</Text>
                <StatusBadge status={existingEnrollment.status} />
              </View>
              <Text style={styles.statusCardHint}>{blockedReason}</Text>
              <Text style={styles.statusCardDate}>
                Requested on {existingEnrollment.enrolledAt} · Term {existingEnrollment.term}
              </Text>
            </View>
          ) : null}

          {/* Course Information Card */}
          <View style={[styles.card, shadow.sm]}>
            <Text style={styles.cardTitle}>Course Information</Text>
            <DetailRow icon="pricetag-outline" label="Course Code" value={course.code} />
            <DetailRow icon="person-outline" label="Instructor" value={course.instructor} />
            <DetailRow icon="calendar-outline" label="Academic Term" value={course.term} />
            <DetailRow icon="school-outline" label="Credit Units" value={`${course.credits} SKS`} />
          </View>

          {/* Seat Availability Card */}
          <View style={[styles.card, shadow.sm]}>
            <View style={styles.capacityHeader}>
              <Text style={styles.cardTitle}>Seat Availability</Text>
              <Text style={[styles.capacityCount, isFull && styles.capacityFull]}>
                {seatsTaken} / {capacity} approved
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(ratio * 100)}%`,
                    backgroundColor: isFull
                      ? colors.danger
                      : ratio > 0.75
                        ? colors.warning
                        : colors.primary,
                  },
                ]}
              />
            </View>

            <Text style={styles.capacityNote}>
              {isFull
                ? 'All approved seats are currently filled.'
                : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} remaining. Pending requests do not reserve a seat until approved by the registrar.`}
            </Text>
          </View>

          {/* Inline Error Message (e.g. 409 conflict or network failure) */}
          {submitError ? (
            <View style={styles.errorBanner} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Thumb-Zone Action Footer above safe-area home bar */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {isStudent ? (
          blockedReason ? (
            <>
              <PrimaryButton
                title="View My Enrollments"
                variant="outline"
                onPress={() => router.push('/(tabs)/enrollments')}
                icon={<Ionicons name="clipboard-outline" size={18} color={colors.primary} />}
              />
              <Text style={styles.footerHint}>{blockedReason}</Text>
            </>
          ) : (
            <>
              <PrimaryButton
                variant="gradient"
                title={submitting ? 'Submitting request…' : 'Enroll in this Course'}
                onPress={handleEnroll}
                busy={submitting}
                disabled={submitting}
                icon={<Ionicons name="add-circle-outline" size={20} color="#ffffff" />}
              />
              <Text style={styles.footerHint}>
                {existingStatus === 'rejected'
                  ? 'Your earlier request was rejected. Sending again puts it back to pending for the registrar.'
                  : 'Sends a pending enrollment request to the registrar.'}
              </Text>
            </>
          )
        ) : (
          <PrimaryButton
            title="Manage Requests in Enrollments"
            variant="outline"
            onPress={() => router.push('/(tabs)/enrollments')}
            icon={<Ionicons name="clipboard-outline" size={18} color={colors.primary} />}
          />
        )}
      </View>
    </View>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    gap: spacing.sm,
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  backButton: {
    width: minTap,
    height: minTap,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonLight: {
    width: minTap,
    height: minTap,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorHeaderTitle: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.text,
  },
  codePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  codePillText: {
    color: '#ffffff',
    fontSize: font.small,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: font.small,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  heroMetaText: {
    color: '#ffffff',
    fontSize: font.xs,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: spacing.md,
    gap: 6,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusCardHint: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
  },
  statusCardDate: {
    fontSize: font.xs,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: font.small,
    color: colors.muted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: font.small,
    color: colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityCount: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  capacityFull: {
    color: colors.danger,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityNote: {
    fontSize: font.xs,
    color: colors.muted,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: font.small,
    color: colors.danger,
    fontWeight: '600',
    lineHeight: 19,
  },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: {
    fontSize: font.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  successScreen: {
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
    marginBottom: spacing.xs,
  },
  successTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  successCourse: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  successBadgeWrap: {
    marginVertical: 4,
  },
  successMeta: {
    fontSize: font.small,
    color: colors.muted,
    textAlign: 'center',
  },
  successHint: {
    fontSize: font.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  successActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
})
