import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ListRow, { StatusBadge } from '../../components/ListRow'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, gradients, radii, shadow, spacing } from '../../theme'

const FILTERS = ['All', 'Approved', 'Pending', 'Rejected']

// "today", "1 day ago", "12 days ago" from an ISO date (YYYY-MM-DD). Dates in the future read as today.
function age(dateText) {
  const then = Date.parse(`${dateText}T00:00:00`)
  if (Number.isNaN(then)) return ''
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000))
  return days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`
}

export default function EnrollmentsScreen() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'administrator'
  const { items, error, refreshing, reload, refresh } = useApiList(api.enrollments)
  // Seat counts for the administrator's decision (approved / capacity per course).
  const { items: courses, refresh: refreshCourses } = useApiList(api.courses)
  const [activeFilter, setActiveFilter] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)

  // Returning from the enrollment form must show the new request without a pull-to-refresh.
  // The first focus is skipped because useApiList has already loaded on mount.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }
      refresh()
    }, [refresh]),
  )

  const filteredItems = useMemo(() => {
    if (!items) return []
    const rows = activeFilter === 'All'
      ? items
      : items.filter((e) => (e.status || '').toLowerCase() === activeFilter.toLowerCase())
    // Students see their newest request first, like "My Enrollments" on the web enroll page.
    // Admin: pending requests first (the ones that need a decision), then newest first.
    // Student: newest first, like "My Enrollments" on the web enroll page.
    const byDate = (a, b) => String(b.enrolledAt).localeCompare(String(a.enrolledAt))
    return [...rows].sort(isAdmin
      ? (a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || byDate(a, b)
      : byDate)
  }, [items, activeFilter, isAdmin])
  const approvedCredits = (items || [])
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (e.credits || 0), 0)

  // Approve/reject cannot be undone from the app, so the registrar confirms first.
  function confirmStatusChange(item, nextStatus) {
    const verb = nextStatus === 'approved' ? 'Approve' : 'Reject'
    Alert.alert(
      `${verb} request?`,
      `${item.studentName} · ${item.courseCode} ${item.courseTitle}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: verb, style: nextStatus === 'rejected' ? 'destructive' : 'default', onPress: () => handleStatusChange(item.id, nextStatus) },
      ],
    )
  }

  // Student: withdraw an own pending request (DELETE /api/enrollments/:id).
  function confirmWithdraw(item) {
    Alert.alert(
      'Withdraw request?',
      `${item.courseCode} ${item.courseTitle}. You can request it again later.`,
      [
        { text: 'Keep request', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(item.id)
            try {
              await api.deleteEnrollment(item.id)
              await Promise.allSettled([refresh(), refreshCourses()])
            } catch (err) {
              if (err.status !== 401) Alert.alert('Could not withdraw', err.message || 'Try again.')
            } finally {
              setUpdatingId(null)
            }
          },
        },
      ],
    )
  }

  async function handleStatusChange(id, nextStatus) {
    setUpdatingId(id)
    try {
      await api.updateEnrollmentStatus(id, nextStatus)
      await Promise.allSettled([refresh(), refreshCourses()])
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Could not update status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingItems = (items || []).filter((e) => e.status === 'pending')
  const pendingCount = pendingItems.length
  const oldestPending = pendingItems.map((e) => e.enrolledAt).sort()[0] ?? ''
  const courseById = new Map((courses || []).map((c) => [c.id, c]))

  if (!items && error) return <ErrorView message={error} onRetry={reload} />
  if (!items) return <LoadingView label="Loading enrollments…" />

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(enrollment) => String(enrollment.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Royal Navy Header matching reference image */}
          <LinearGradient
            colors={isAdmin ? gradients.heroAdmin : gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroBanner,
              shadow.glow,
              { paddingTop: Math.max(insets.top, 16) + 12 },
            ]}
          >
            <View style={styles.waveOverlay} />

            <View style={styles.bannerTop}>
              <View style={styles.frostedPill}>
                <Ionicons name="clipboard-outline" size={13} color="#ffffff" />
                <Text style={styles.frostedPillText}>Enrollment Center</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {isAdmin ? 'University Enrollments' : 'My Course Enrollments'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isAdmin
                ? 'Review student enrollment requests and course quotas.'
                : `Every request you submitted and the registrar decision · ${approvedCredits} SKS approved`}
            </Text>
          </LinearGradient>

          {/* Filter Chips Bar */}
          {isAdmin && pendingCount > 0 ? (
            <Pressable
              onPress={() => setActiveFilter('Pending')}
              style={styles.decisionBanner}
              accessibilityRole="button"
            >
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.decisionTitle}>
                  {pendingCount} {pendingCount === 1 ? 'request needs' : 'requests need'} your decision
                </Text>
                <Text style={styles.decisionSub}>Oldest waiting since {oldestPending}. Tap to show only pending.</Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.filterBar}>
            {FILTERS.map((f) => {
              const active = activeFilter === f
              const count =
                f === 'All'
                  ? items?.length ?? 0
                  : items?.filter(
                      (e) => (e.status || '').toLowerCase() === f.toLowerCase(),
                    ).length ?? 0

              return (
                <Pressable
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                  <View
                    style={[
                      styles.filterBadge,
                      active && styles.filterBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        active && styles.filterBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyView
          title={`No ${activeFilter.toLowerCase()} enrollments`}
          message={
            isAdmin
              ? 'Enrollment requests submitted by students will appear here.'
              : 'Requests you make will show up here.'
          }
        />
      }
      renderItem={({ item }) => isAdmin ? (
        <AdminRequestCard
          item={item}
          course={courseById.get(item.courseId)}
          busy={updatingId === item.id}
          onApprove={() => confirmStatusChange(item, 'approved')}
          onReject={() => confirmStatusChange(item, 'rejected')}
        />
      ) : (
        <View style={styles.cardWrap}>
          <ListRow
            badgeText={item.courseCode}
            title={item.courseTitle}
            subtitle={isAdmin ? `${item.studentName} (${item.studentId})` : `Term ${item.term}`}
            meta={`${item.credits} SKS · Submitted ${item.enrolledAt ?? '—'}${isAdmin ? ` · Term ${item.term}` : ''}`}
            right={<StatusBadge status={item.status} />}
          />
          {item.status === 'pending' ? (
            <View style={styles.actionRow}>
              <Text style={styles.waitingText}>Waiting for the registrar</Text>
              <Pressable
                onPress={() => confirmWithdraw(item)}
                disabled={updatingId === item.id}
                style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Withdraw request for ${item.courseCode}`}
              >
                <Ionicons name="arrow-undo" size={15} color={colors.danger} />
                <Text style={styles.rejectText}>{updatingId === item.id ? 'Withdrawing…' : 'Withdraw'}</Text>
              </Pressable>
            </View>
          ) : null}

        </View>
      )}
    />
  )
}

// One request as the registrar sees it: who, which course, when, and whether a seat is free.
function AdminRequestCard({ item, course, busy, onApprove, onReject }) {
  const isPending = item.status === 'pending'
  const seatsLeft = course ? Math.max(0, course.capacity - course.enrolled) : null
  return (
    <View style={[styles.reqCard, isPending && styles.reqCardPending, shadow.sm]}>
      <View style={styles.reqTop}>
        <Text style={[styles.reqKind, isPending && styles.reqKindPending]}>
          {isPending ? 'NEW REQUEST' : item.status === 'approved' ? 'APPROVED' : 'REJECTED'}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.reqStudent}>{item.studentName}</Text>
      <Text style={styles.reqStudentId}>Student ID {item.studentId}</Text>
      <Text style={styles.reqSentence}>
        {isPending ? 'wants to enroll in ' : item.status === 'approved' ? 'is enrolled in ' : 'was refused for '}
        <Text style={styles.reqCourse}>{item.courseCode} · {item.courseTitle}</Text>
      </Text>
      <View style={styles.reqFacts}>
        <Text style={styles.reqFact}>
          <Ionicons name="time-outline" size={12} color={colors.muted} /> Submitted {item.enrolledAt} ({age(item.enrolledAt)})
        </Text>
        <Text style={styles.reqFact}>
          <Ionicons name="book-outline" size={12} color={colors.muted} /> {item.credits} SKS · Term {item.term}
        </Text>
        {course ? (
          <Text style={[styles.reqFact, seatsLeft === 0 && styles.reqFull]}>
            <Ionicons name="people-outline" size={12} color={seatsLeft === 0 ? colors.danger : colors.muted} />{' '}
            {seatsLeft === 0 ? 'Class is full — approving will fail' : `${seatsLeft} seats left (${course.enrolled}/${course.capacity} approved)`}
          </Text>
        ) : null}
      </View>
      {isPending ? (
        <View style={styles.reqActions}>
          <Pressable
            onPress={onReject}
            disabled={busy}
            style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, styles.reqBtn, pressed && styles.btnPressed]}
          >
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>
          <Pressable
            onPress={onApprove}
            disabled={busy || seatsLeft === 0}
            style={({ pressed }) => [styles.actionBtn, styles.approveBtn, styles.reqBtn, (busy || seatsLeft === 0) && { opacity: 0.5 }, pressed && styles.btnPressed]}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.approveText}>Approve</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  waitingText: { flex: 1, fontSize: font.small, color: colors.muted },
  decisionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.warningBorder, backgroundColor: colors.warningSoft,
  },
  decisionTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  decisionSub: { fontSize: font.small, color: colors.textSecondary },
  reqCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 4,
  },
  reqCardPending: { borderColor: colors.warningBorder, borderLeftWidth: 4, borderLeftColor: colors.warning },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  reqKind: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.muted },
  reqKindPending: { color: colors.warning },
  reqStudent: { fontSize: font.title, fontWeight: '800', color: colors.text },
  reqStudentId: { fontSize: font.small, color: colors.muted },
  reqSentence: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
  reqCourse: { fontWeight: '700', color: colors.primaryDark },
  reqFacts: { marginTop: 6, gap: 3 },
  reqFact: { fontSize: font.small, color: colors.textSecondary },
  reqFull: { color: colors.danger, fontWeight: '700' },
  reqActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  reqBtn: { flex: 1, justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1, backgroundColor: colors.background },
  header: { marginBottom: spacing.xs, gap: 12 },
  heroBanner: {
    // Full width under the status bar, like the Grades and Dashboard headers.
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  waveOverlay: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -80,
    height: 160,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  sparkle1: {
    position: 'absolute',
    top: 36,
    right: 40,
    color: '#fde047',
    fontSize: 16,
    zIndex: 2,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 24,
    right: 110,
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
    zIndex: 2,
  },
  bannerTop: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  frostedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  frostedPillText: {
    fontSize: font.xs,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTitle: { fontSize: font.heading, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: font.small, color: '#bfdbfe', marginTop: 2 },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: font.xs,
    fontWeight: '700',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  filterBadgeTextActive: {
    color: '#ffffff',
  },
  cardWrap: { gap: 6 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  approveBtn: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  rejectBtn: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  approveText: { fontSize: font.xs, fontWeight: '700', color: colors.success },
  rejectText: { fontSize: font.xs, fontWeight: '700', color: colors.danger },
  btnPressed: { opacity: 0.75 },
})
