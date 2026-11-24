import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CourseCard from '../../components/CourseCard'
import CourseFormSheet from '../../components/CourseFormSheet'
import StatCard from '../../components/StatCard'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../../theme'

export default function DashboardScreen() {
  const { user, gpa, refreshMe } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const isStudent = user?.role !== 'administrator'
  const [searchQuery, setSearchQuery] = useState('')
  // Admin course form: null = closed, {} = new course, a course object = edit it
  const [courseForm, setCourseForm] = useState(null)
  const [notice, setNotice] = useState(null)

  const {
    items: courses,
    error: coursesError,
    refreshing: coursesRefreshing,
    reload: reloadCourses,
    refresh: refreshCourses,
  } = useApiList(api.courses)

  const {
    items: enrollments,
    refreshing: enrollmentsRefreshing,
    refresh: refreshEnrollments,
  } = useApiList(api.enrollments)

  const refreshing = coursesRefreshing || enrollmentsRefreshing

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([
      refreshCourses(),
      refreshEnrollments(),
      refreshMe(),
    ])
  }, [refreshCourses, refreshEnrollments, refreshMe])

  // Coming back from the enrollment form (or another tab) must show the new seat count and
  // pending total. The first focus is skipped because useApiList already loaded on mount.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }
      onRefresh()
    }, [onRefresh]),
  )

  // Filter courses based on search
  const filteredCourses = useMemo(() => {
    if (!courses) return []
    if (!searchQuery.trim()) return courses
    const q = searchQuery.toLowerCase().trim()
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q),
    )
  }, [courses, searchQuery])

  // A course can be requested only once — the API answers 409 for a second row — so a course
  // that already has an enrollment shows its status instead of an Enroll button.
  const enrollmentByCourse = useMemo(() => {
    const map = new Map()
    for (const enrollment of enrollments ?? []) map.set(enrollment.courseId, enrollment.status)
    return map
  }, [enrollments])

  // Student catalog: approved courses live in the Enrollments tab, so they are left out here.
  // Order: open courses first, then pending requests, rejected requests, and full courses last.
  const approvedCourseCount = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'approved').length,
    [enrollments],
  )
  const catalogItems = useMemo(() => {
    if (!isStudent) {
      return [...filteredCourses].sort((a, b) => a.code.localeCompare(b.code))
        .map((course) => ({ type: 'course', key: course.id, course }))
    }
    const rank = (course) => {
      const status = enrollmentByCourse.get(course.id)
      if (status === 'pending') return 1
      if (status === 'rejected') return 2
      if (course.enrolled >= course.capacity) return 3
      return 0
    }
    const labels = ['Available to enroll', 'Waiting for approval', 'Rejected requests', 'Full classes']
    const visible = filteredCourses
      .filter((course) => enrollmentByCourse.get(course.id) !== 'approved')
      .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code))
    const items = []
    let lastRank = -1
    for (const course of visible) {
      const r = rank(course)
      if (r !== lastRank) {
        items.push({ type: 'header', key: `h${r}`, title: labels[r], count: visible.filter((c) => rank(c) === r).length })
        lastRank = r
      }
      items.push({ type: 'course', key: course.id, course })
    }
    return items
  }, [filteredCourses, enrollmentByCourse, isStudent])
  const catalogCount = catalogItems.filter((item) => item.type === 'course').length

  if (!courses && coursesError) {
    return <ErrorView message={coursesError} onRetry={reloadCourses} />
  }
  if (!courses) {
    return <LoadingView label="Loading dashboard…" />
  }

  // Calculate statistics exactly like Web Dashboard.jsx
  const totalEnrollments = enrollments?.length ?? 0
  const approvedCount =
    enrollments?.filter((e) => e.status === 'approved').length ?? 0
  const pendingCount =
    enrollments?.filter((e) => e.status === 'pending').length ?? 0
  const studentCount = enrollments
    ? new Set(enrollments.map((e) => e.studentId)).size
    : 0

  const gpaDisplay =
    gpa != null ? (typeof gpa === 'number' ? gpa.toFixed(2) : gpa) : '—'

  return (
    <>
    <FlatList
      data={catalogItems}
      keyExtractor={(item) => String(item.key)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Modern Hero Gradient Banner */}
          <LinearGradient
            colors={isStudent ? gradients.hero : gradients.heroAdmin}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroCard,
              shadow.glow,
              { paddingTop: Math.max(insets.top, 16) + 14 },
            ]}
          >
            {/* Background Decorative Circles & Waves */}
            <View style={styles.decoCircle1} />
            <View style={styles.decoCircle2} />
            <View style={styles.waveOverlay} />

            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {user?.role === 'administrator' ? 'Staff Portal' : 'Academic Portal'}
                  </Text>
                </View>

              </View>

              <Text style={styles.heroTitle}>Welcome back,</Text>
              <Text style={styles.heroName}>{user?.name}</Text>
              <Text style={styles.heroSubtitle}>
                {isStudent
                  ? `${user?.program || 'Computer Science'} · ${user?.studentId || ''}`
                  : `${user?.department || 'Academic Administration'} · ${user?.title || 'Staff'}`}
              </Text>

              {/* Quick Glance in Hero */}
              <View style={styles.heroGlance}>
                <View style={styles.heroGlanceItem}>
                  <Text style={styles.heroGlanceLabel}>
                    {isStudent ? 'Current GPA' : 'Total Students'}
                  </Text>
                  <Text style={styles.heroGlanceValue}>
                    {isStudent ? gpaDisplay : studentCount}
                  </Text>
                </View>
                <View style={styles.heroGlanceDivider} />
                <View style={styles.heroGlanceItem}>
                  <Text style={styles.heroGlanceLabel}>
                    {isStudent ? 'Active Courses' : 'Pending Requests'}
                  </Text>
                  <Text style={styles.heroGlanceValue}>
                    {isStudent ? approvedCount : pendingCount}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Stat Cards 2x2 Grid matching Web Dashboard */}
          <View style={styles.statsContainer}>
            {isStudent ? (
              <>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Enrolled"
                    value={totalEnrollments}
                    iconName="book"
                    iconColor={colors.primary}
                    iconBg={colors.primarySoft}
                  />
                  <StatCard
                    label="Approved"
                    value={approvedCount}
                    color={colors.success}
                    iconName="checkmark-circle"
                    iconColor={colors.success}
                    iconBg={colors.successSoft}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Pending"
                    value={pendingCount}
                    hint={pendingCount > 0 ? 'Needs review' : undefined}
                    color={pendingCount > 0 ? colors.warning : colors.text}
                    iconName="time"
                    iconColor={colors.warning}
                    iconBg={colors.warningSoft}
                  />
                  <StatCard
                    label="GPA"
                    value={gpaDisplay}
                    hint={gpa == null ? 'No grades yet' : 'Weighted 4.0 scale'}
                    color={colors.primary}
                    iconName="trophy"
                    iconColor={colors.purple}
                    iconBg={colors.purpleSoft}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Offerings"
                    value={courses.length}
                    iconName="school"
                    iconColor={colors.primary}
                    iconBg={colors.primarySoft}
                  />
                  <StatCard
                    label="Students"
                    value={studentCount}
                    iconName="people"
                    iconColor={colors.purple}
                    iconBg={colors.purpleSoft}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Total Enrollments"
                    value={totalEnrollments}
                    iconName="file-tray-full"
                    iconColor={colors.primary}
                    iconBg={colors.primarySoft}
                  />
                  <StatCard
                    label="Pending Approvals"
                    value={pendingCount}
                    hint={pendingCount > 0 ? 'Action required' : undefined}
                    color={pendingCount > 0 ? colors.warning : colors.text}
                    iconName="alert-circle"
                    iconColor={colors.warning}
                    iconBg={colors.warningSoft}
                  />
                </View>
              </>
            )}
          </View>

          {/* Search Bar & Section Header */}
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Course Catalog</Text>
              </View>
              {isStudent ? (
                <Text style={styles.sectionCount}>{catalogCount} {catalogCount === 1 ? 'course' : 'courses'}</Text>
              ) : (
                <Pressable
                  onPress={() => { setNotice(null); setCourseForm({}) }}
                  style={({ pressed }) => [styles.addCourseBtn, pressed && styles.enrollButtonPressed]}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={18} color={colors.primaryText} />
                  <Text style={styles.addCourseText}>Add Course</Text>
                </Pressable>
              )}
            </View>
            {!isStudent ? <Text style={styles.adminHint}>Tap a course to edit or delete it.</Text> : null}
            {notice ? (
              <View style={styles.noticeBox} accessibilityRole="alert">
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            {/* Quick Search Input */}
            <View style={[styles.searchBox, shadow.sm]}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search courses, instructors, codes…"
                placeholderTextColor={colors.mutedLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyView
          title={searchQuery ? 'No courses matched' : 'Nothing left to enroll'}
          message={searchQuery
            ? `No courses found matching "${searchQuery}".`
            : 'Every course already has a request from you. Check the Enrollments tab.'}
        />
      }
      ListFooterComponent={
        isStudent && approvedCourseCount > 0 ? (
          <Pressable
            onPress={() => router.navigate('/enrollments')}
            style={({ pressed }) => [styles.approvedNote, pressed && styles.enrollButtonPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.approvedNoteText}>
              {approvedCourseCount} approved {approvedCourseCount === 1 ? 'course is' : 'courses are'} in Enrollments
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ) : null
      }
      renderItem={({ item }) =>
        item.type === 'header' ? (
          <Text style={styles.groupHeader}>
            {item.title.toUpperCase()}  <Text style={styles.groupCount}>{item.count}</Text>
          </Text>
        ) : (
          <CourseCard
            course={item.course}
            status={isStudent ? enrollmentByCourse.get(item.course.id) : undefined}
            showAction={isStudent}
            onPress={() => (isStudent ? router.push(`/course/${item.course.id}`) : (setNotice(null), setCourseForm(item.course)))}
          />
        )
      }
    />
    {!isStudent && courseForm ? (
      <CourseFormSheet
        key={courseForm.id ?? 'new'}
        course={courseForm.id ? courseForm : null}
        onClose={() => setCourseForm(null)}
        onChanged={(message) => { setNotice(message); onRefresh() }}
      />
    ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  addCourseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: spacing.md,
    borderRadius: radii.pill, backgroundColor: colors.primary,
  },
  addCourseText: { color: colors.primaryText, fontWeight: '800', fontSize: font.small },
  adminHint: { fontSize: font.small, color: colors.muted },
  noticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.successBorder, backgroundColor: colors.successSoft,
  },
  noticeText: { flex: 1, fontSize: font.small, fontWeight: '600', color: colors.text },
  groupHeader: {
    marginTop: spacing.sm, paddingHorizontal: spacing.md,
    fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.muted,
  },
  groupCount: { color: colors.primary },
  approvedNote: {
    marginHorizontal: spacing.md, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.successBorder,
    backgroundColor: colors.successSoft,
  },
  approvedNoteText: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.text },
  courseRequestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  courseRequestLabel: { fontSize: font.small, color: colors.muted, fontWeight: '600' },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  heroCard: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  courseItemWrap: {
    paddingHorizontal: spacing.md,
  },
  courseActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: minTap,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
  },
  enrollButtonPressed: { opacity: 0.75 },
  enrollButtonText: { fontSize: font.small, fontWeight: '700', color: colors.primaryDark },
  courseStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  courseStatusText: { fontSize: font.xs, fontWeight: '700', color: colors.muted },
  courseStatusFull: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  courseStatusFullText: { color: colors.danger },
  sparkle1: {
    position: 'absolute',
    top: 50,
    right: 140,
    color: '#fde047',
    fontSize: 16,
    zIndex: 2,
  },
  sparkle2: {
    position: 'absolute',
    top: 95,
    right: 30,
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
    zIndex: 2,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 50,
    right: 120,
    color: '#fde047',
    fontSize: 17,
    zIndex: 2,
  },
  waveOverlay: {
    position: 'absolute',
    left: -60,
    right: -60,
    bottom: -90,
    height: 180,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  heroQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  heroQuickDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  decoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -60,
    right: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroContent: {
    gap: 4,
    zIndex: 1,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroBadgeText: {
    fontSize: font.xs,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  termTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  termTagText: {
    fontSize: font.xs,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: font.small,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: font.small,
    color: '#bfdbfe',
    marginTop: 2,
  },
  heroGlance: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroGlanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroGlanceLabel: {
    fontSize: font.xs,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  heroGlanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  heroGlanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 4,
  },
  statsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  sectionHeaderWrap: {
    paddingHorizontal: spacing.md,
    gap: 8,
    marginTop: spacing.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.text,
  },
  sectionCount: {
    fontSize: font.small,
    color: colors.muted,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: font.small,
    color: colors.text,
  },
})
