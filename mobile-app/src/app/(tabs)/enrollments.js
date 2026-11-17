import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
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

export default function EnrollmentsScreen() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'administrator'
  const { items, error, refreshing, reload, refresh } = useApiList(api.enrollments)
  const [activeFilter, setActiveFilter] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (activeFilter === 'All') return items
    return items.filter(
      (e) => (e.status || '').toLowerCase() === activeFilter.toLowerCase(),
    )
  }, [items, activeFilter])

  async function handleStatusChange(id, nextStatus) {
    setUpdatingId(id)
    try {
      await api.updateEnrollmentStatus(id, nextStatus)
      await refresh()
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Could not update status.')
    } finally {
      setUpdatingId(null)
    }
  }

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
                : 'Track course submissions and registrar approvals.'}
            </Text>
          </LinearGradient>

          {/* Filter Chips Bar */}
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
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <ListRow
            badgeText={item.courseCode}
            title={item.courseTitle}
            subtitle={isAdmin ? `${item.studentName} (${item.studentId})` : `Term ${item.term}`}
            meta={`${item.credits} Credits · Requested on ${item.enrolledAt ?? 'Term Start'}`}
            right={<StatusBadge status={item.status} />}
          />

          {/* Admin Approve/Reject Action Buttons matching Web */}
          {isAdmin && item.status === 'pending' ? (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handleStatusChange(item.id, 'approved')}
                disabled={updatingId === item.id}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.approveBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                <Text style={styles.approveText}>Approve</Text>
              </Pressable>

              <Pressable
                onPress={() => handleStatusChange(item.id, 'rejected')}
                disabled={updatingId === item.id}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.rejectBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="close-circle" size={15} color={colors.danger} />
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1, backgroundColor: colors.background },
  header: { marginBottom: spacing.xs, gap: 12 },
  heroBanner: {
    borderRadius: radii.xl,
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
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
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
    gap: spacing.sm,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
