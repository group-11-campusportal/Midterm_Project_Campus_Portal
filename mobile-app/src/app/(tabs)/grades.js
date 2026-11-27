import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ListRow, { StatusBadge } from '../../components/ListRow'
import EditGradeSheet from '../../components/EditGradeSheet'
import RecordGradeModal from '../../components/RecordGradeModal'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../../theme'

// Wording follows the web pages: "University Grade Records" (admin, src/pages/FormOutput.jsx)
// and "My Academic Grades" (student, src/pages/Dashboard.jsx). Every number on this screen
// comes from GET /api/grades, GET /api/enrollments or GET /api/auth/me.
export default function GradesScreen() {
  const { user, gpa, refreshMe } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'administrator'
  const [activeTab, setActiveTab] = useState('grades') // student only: 'grades' | 'courses'
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordKey, setRecordKey] = useState(0)
  const [recordInitial, setRecordInitial] = useState(null)
  const [editingGrade, setEditingGrade] = useState(null)
  const [showAllUngraded, setShowAllUngraded] = useState(false)
  const [notice, setNotice] = useState(null)

  const { items: grades, error, refreshing, reload, refresh } = useApiList(api.grades)
  const {
    items: enrollments,
    refreshing: enrollmentsRefreshing,
    refresh: refreshEnrollments,
  } = useApiList(api.enrollments)

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([refresh(), refreshEnrollments(), refreshMe()])
  }, [refresh, refreshEnrollments, refreshMe])

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

  const approvedCourses = useMemo(
    () => (enrollments || []).filter((e) => e.status === 'approved'),
    [enrollments],
  )
  // Newest first, like the web ledger.
  const sortedGrades = useMemo(() => [...(grades || [])].reverse(), [grades])

  // Approved enrollments that still have no grade: the registrar's to-do list.
  const ungraded = useMemo(() => {
    const graded = new Set((grades || []).map((g) => g.enrollmentId))
    return approvedCourses
      .filter((e) => !graded.has(e.id))
      .sort((a, b) => String(a.enrolledAt).localeCompare(String(b.enrolledAt)))
  }, [grades, approvedCourses])

  function openRecord(enrollment) {
    setNotice(null)
    setRecordInitial(enrollment)
    setRecordKey((k) => k + 1)
    setRecordOpen(true)
  }

  function handleRecorded(grade) {
    setNotice(
      `Grade ${grade.letter} (${Number(grade.points).toFixed(1)} pts) recorded for ${grade.studentName} in ${grade.courseCode}.`,
    )
    onRefresh()
  }

  if (!grades && error) return <ErrorView message={error} onRetry={reload} />
  if (!grades) return <LoadingView label="Loading grade records…" />

  const gradedCount = grades.length
  const totalCredits = grades.reduce((sum, g) => sum + (g.credits || 0), 0)
  const averageScore = gradedCount
    ? (grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0) / gradedCount).toFixed(1)
    : '—'
  const highGrades = grades.filter((g) => (Number(g.points) || 0) >= 3.5).length
  const gpaDisplay = gpa != null && Number(gpa) > 0 ? Number(gpa).toFixed(2) : '—'
  const terms = [...new Set(grades.map((g) => g.term))].sort().join(', ')
  // Current academic term, like the "Academic Term" card on the web Grade Records page:
  // the newest term among grades and enrollments.
  const currentTerm = [...new Set([...grades, ...(enrollments || [])].map((r) => r.term).filter(Boolean))]
    .sort().reverse()[0] ?? '—'
  const showCourses = !isAdmin && activeTab === 'courses'

  const stats = isAdmin
    ? [
        { label: 'Total grades', value: String(gradedCount) },
        { label: 'Average score', value: averageScore === '—' ? '—' : `${averageScore}` },
        { label: 'Grades ≥ 3.5 pts', value: String(highGrades) },
        { label: 'Academic term', value: currentTerm },
      ]
    : [
        { label: 'GPA (4.0 scale)', value: gpaDisplay },
        { label: 'Graded courses', value: String(gradedCount) },
        { label: 'Graded credits', value: `${totalCredits} SKS` },
      ]

  return (
    <View style={styles.screen}>
      <FlatList
        data={showCourses ? approvedCourses : sortedGrades}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || enrollmentsRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={isAdmin ? gradients.heroAdmin : gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
            >
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrow}>
                  <Ionicons name={isAdmin ? 'library-outline' : 'school-outline'} size={13} color="#ffffff" />
                  <Text style={styles.eyebrowText}>{isAdmin ? 'Academic Registry' : 'My Academic Records'}</Text>
                </View>
                {isAdmin && currentTerm !== '—' ? (
                  <View style={styles.termTag}>
                    <Text style={styles.termTagText}>Term {currentTerm}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroTitle}>
                {isAdmin ? 'University Grade Records' : 'My Academic Grades'}
              </Text>
              <Text style={styles.heroDescription}>
                {isAdmin
                  ? 'Every grade recorded across all programs, newest first. Tap a grade to edit it.'
                  : 'Recorded letter grades and course credit points.'}
              </Text>

              <View style={styles.statsRow}>
                {stats.map((stat) => (
                  <View key={stat.label} style={[styles.statTile, stats.length === 4 && styles.statTileHalf]}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {isAdmin ? (
                <Pressable
                  onPress={() => openRecord(null)}
                  style={({ pressed }) => [styles.recordButton, pressed && styles.recordButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Record a grade"
                >
                  <Ionicons name="add-circle" size={20} color={colors.primaryDeep} />
                  <Text style={styles.recordButtonText}>Record Grade</Text>
                </Pressable>
              ) : null}
            </LinearGradient>

            {isAdmin && ungraded.length > 0 ? (
              <View style={styles.ungradedCard}>
                <View style={styles.ungradedHead}>
                  <Ionicons name="warning" size={18} color={colors.warning} />
                  <Text style={styles.ungradedTitle}>
                    {ungraded.length} approved {ungraded.length === 1 ? 'enrollment has' : 'enrollments have'} no grade yet
                  </Text>
                </View>
                {(showAllUngraded ? ungraded : ungraded.slice(0, 3)).map((e) => (
                  <View key={e.id} style={styles.ungradedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ungradedStudent}>{e.studentName} · {e.studentId}</Text>
                      <Text style={styles.ungradedCourse}>{e.courseCode} {e.courseTitle} · Term {e.term}</Text>
                    </View>
                    <Pressable
                      onPress={() => openRecord(e)}
                      style={({ pressed }) => [styles.ungradedBtn, pressed && { opacity: 0.85 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Record grade for ${e.studentName} in ${e.courseCode}`}
                    >
                      <Text style={styles.ungradedBtnText}>Grade</Text>
                    </Pressable>
                  </View>
                ))}
                {ungraded.length > 3 ? (
                  <Pressable onPress={() => setShowAllUngraded((v) => !v)} hitSlop={8}>
                    <Text style={styles.ungradedMore}>{showAllUngraded ? 'Show less' : `Show all ${ungraded.length}`}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {notice ? (
              <View style={styles.notice} accessibilityRole="alert">
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.noticeText}>{notice}</Text>
                <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityLabel="Dismiss">
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ) : null}

            {!isAdmin ? (
              <View style={styles.toggleRow}>
                <ToggleTab
                  active={activeTab === 'grades'}
                  onPress={() => setActiveTab('grades')}
                  title="My Grades"
                  caption={`${gradedCount} recorded`}
                />
                <ToggleTab
                  active={activeTab === 'courses'}
                  onPress={() => setActiveTab('courses')}
                  title="Approved Courses"
                  caption={`${approvedCourses.length} approved`}
                />
              </View>
            ) : null}

            {!isAdmin && activeTab === 'grades' && gradedCount > 0 && gpa != null ? (
              <GpaCard gpa={gpa} totalCredits={totalCredits} count={gradedCount} terms={terms} />
            ) : null}

            <Text style={styles.sectionTitle}>
              {showCourses ? 'Approved courses' : isAdmin ? 'Grade Registry Ledger' : 'Course grades'}
              <Text style={styles.sectionCount}>
                {'  '}{showCourses ? approvedCourses.length : gradedCount} records
              </Text>
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyView
            title={showCourses ? 'No approved courses yet' : 'No grades recorded yet'}
            message={
              showCourses
                ? 'Courses approved by the registrar will appear here.'
                : isAdmin
                  ? 'Tap Record Grade to enter a score for an approved enrollment.'
                  : 'Grades recorded for your approved enrollments will appear here.'
            }
          />
        }
        renderItem={({ item }) =>
          showCourses ? (
            <View style={styles.rowWrap}>
              <ListRow
                badgeText={item.courseCode}
                title={item.courseTitle}
                subtitle={`Term ${item.term} · ${item.credits} SKS`}
                meta={`Requested on ${item.enrolledAt ?? '—'}`}
                right={<StatusBadge status={item.status} />}
              />
            </View>
          ) : (
            <GradeRow grade={item} showStudent={isAdmin} onPress={isAdmin ? () => { setNotice(null); setEditingGrade(item) } : undefined} />
          )
        }
      />

      {isAdmin ? (
        <RecordGradeModal
          key={recordKey}
          initial={recordInitial}
          visible={recordOpen}
          onClose={() => setRecordOpen(false)}
          enrollments={enrollments}
          grades={grades}
          onRecorded={handleRecorded}
        />
      ) : null}

      {isAdmin && editingGrade ? (
        <EditGradeSheet
          key={editingGrade.id}
          grade={editingGrade}
          onClose={() => setEditingGrade(null)}
          onChanged={(message) => { setNotice(message); onRefresh() }}
        />
      ) : null}
    </View>
  )
}

function ToggleTab({ active, onPress, title, caption }) {
  return (
    <Pressable
      style={[styles.toggleTab, active && styles.toggleTabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.toggleTabText, active && styles.toggleTabTextActive]}>{title}</Text>
      <Text style={[styles.toggleTabCaption, active && styles.toggleTabCaptionActive]}>{caption}</Text>
    </Pressable>
  )
}

function GradeRow({ grade, showStudent, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.gradeCard, shadow.sm, pressed && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Edit grade ${grade.letter} for ${grade.studentName} in ${grade.courseCode}` : undefined}
    >
      <View style={styles.gradeMain}>
        <View style={styles.codeRow}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{grade.courseCode}</Text>
          </View>
          <Text style={styles.termText}>Term {grade.term}</Text>
        </View>
        <Text style={styles.courseTitle} numberOfLines={2}>{grade.courseTitle}</Text>
        {showStudent ? (
          <View style={styles.studentRow}>
            <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.studentText} numberOfLines={1}>
              {grade.studentName} · {grade.studentId}
            </Text>
          </View>
        ) : null}
        <Text style={styles.gradeMeta}>
          Score <Text style={styles.gradeMetaStrong}>{grade.score}</Text> / 100 · {grade.credits} SKS
        </Text>
      </View>
      <View style={styles.letterBox}>
        <Text style={styles.letter}>{grade.letter ?? '—'}</Text>
        {grade.points != null ? (
          <Text style={styles.points}>{Number(grade.points).toFixed(1)} pts</Text>
        ) : null}
        {onPress ? <Text style={styles.editHint}>Edit</Text> : null}
      </View>
    </Pressable>
  )
}

function GpaCard({ gpa, totalCredits, count, terms }) {
  const numeric = Number(gpa) || 0
  const standing =
    numeric >= 3.5 ? "Dean's List · First Class Standing"
      : numeric >= 3.0 ? 'Good Academic Standing'
        : 'Satisfactory Standing'

  return (
    <View style={[styles.gpaCard, shadow.sm]}>
      <View style={styles.gpaLeft}>
        <Text style={styles.gpaLabel}>Cumulative GPA</Text>
        <Text style={styles.gpaHint}>Credit-weighted, {count} course{count === 1 ? '' : 's'} · {totalCredits} SKS</Text>
        <View style={styles.standingBadge}>
          <Ionicons name="ribbon-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.standingText}>{standing}</Text>
        </View>
        {terms ? <Text style={styles.gpaTerms}>Term {terms}</Text> : null}
      </View>
      <View style={styles.gpaRight}>
        <Text style={styles.gpaValue}>{numeric.toFixed(2)}</Text>
        <Text style={styles.gpaScale}>out of 4.00</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  editHint: { marginTop: 2, fontSize: 11, fontWeight: '800', color: colors.primary },
  ungradedCard: {
    marginHorizontal: spacing.md, padding: spacing.md, gap: spacing.sm, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.warningBorder, backgroundColor: colors.warningSoft,
  },
  ungradedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ungradedTitle: { flex: 1, fontSize: font.body, fontWeight: '800', color: colors.text },
  ungradedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.warningBorder,
  },
  ungradedStudent: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  ungradedCourse: { fontSize: font.small, color: colors.textSecondary },
  ungradedBtn: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.warning, justifyContent: 'center' },
  ungradedBtnText: { color: '#ffffff', fontWeight: '800', fontSize: font.small },
  ungradedMore: { fontSize: font.small, fontWeight: '700', color: colors.warning, textAlign: 'center' },
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xl, gap: spacing.sm, flexGrow: 1 },
  rowWrap: { paddingHorizontal: spacing.md },
  headerWrap: { gap: spacing.md, marginBottom: spacing.xs },

  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    ...shadow.glow,
  },
  eyebrow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill,
  },
  eyebrowText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: font.heading + 2, fontWeight: '800', color: '#ffffff' },
  heroDescription: { fontSize: font.small + 1, color: '#dbeafe', lineHeight: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  // Four admin tiles sit in a 2 × 2 grid; three student tiles stay in one row.
  statTileHalf: { flexBasis: '47%' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  termTag: { backgroundColor: 'rgba(0, 0, 0, 0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  termTagText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  statTile: {
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: radii.md,
    paddingVertical: 10, paddingHorizontal: spacing.sm, gap: 2,
  },
  statValue: { color: '#ffffff', fontSize: font.title + 2, fontWeight: '800' },
  statLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  recordButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: minTap, borderRadius: radii.md, backgroundColor: '#ffffff', marginTop: spacing.xs,
  },
  recordButtonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  recordButtonText: { color: colors.primaryDeep, fontSize: font.body, fontWeight: '800' },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md,
    backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.successBorder,
    borderRadius: radii.md, padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: font.small, color: colors.text, fontWeight: '600', lineHeight: 18 },

  toggleRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  toggleTab: {
    flex: 1, minHeight: minTap, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  toggleTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleTabText: { fontSize: font.small + 1, fontWeight: '700', color: colors.text },
  toggleTabTextActive: { color: '#ffffff' },
  toggleTabCaption: { fontSize: 12, fontWeight: '600', color: colors.muted },
  toggleTabCaptionActive: { color: '#dbeafe' },

  sectionTitle: {
    fontSize: font.body + 1, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.md, marginTop: spacing.xs,
  },
  sectionCount: { fontSize: font.small, fontWeight: '600', color: colors.muted },

  gradeCard: {
    marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  gradeMain: { flex: 1, gap: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  termText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  courseTitle: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  studentText: { flex: 1, fontSize: font.small + 1, color: colors.textSecondary, fontWeight: '600' },
  gradeMeta: { fontSize: font.small, color: colors.textSecondary },
  gradeMetaStrong: { fontWeight: '800', color: colors.text },
  letterBox: {
    minWidth: 64, alignItems: 'center', backgroundColor: colors.primarySoft, borderWidth: 1,
    borderColor: colors.primaryMuted, borderRadius: radii.md, paddingVertical: 8, paddingHorizontal: 10,
  },
  letter: { fontSize: font.heading, fontWeight: '800', color: colors.primary },
  points: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  gpaCard: {
    marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.primaryMuted,
    padding: spacing.md,
  },
  gpaLeft: { flex: 1, gap: 4 },
  gpaLabel: { fontSize: font.body + 1, fontWeight: '800', color: colors.text },
  gpaHint: { fontSize: font.small, color: colors.textSecondary },
  standingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill,
  },
  standingText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  gpaTerms: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  gpaRight: { alignItems: 'flex-end' },
  gpaValue: { fontSize: 34, fontWeight: '900', color: colors.primaryDeep, lineHeight: 38 },
  gpaScale: { fontSize: 12, color: colors.muted, fontWeight: '600' },
})
