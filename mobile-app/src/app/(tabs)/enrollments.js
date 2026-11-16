import { FlatList, RefreshControl, StyleSheet } from 'react-native'
import ListRow, { StatusBadge } from '../../components/ListRow'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, spacing } from '../../theme'

// The server filters by the user inside the token: a student only ever receives their own rows.
export default function EnrollmentsScreen() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const { items, error, refreshing, reload, refresh } = useApiList(api.enrollments)

  if (!items && error) return <ErrorView message={error} onRetry={reload} />
  if (!items) return <LoadingView label="Loading enrollments…" />

  return (
    <FlatList
      data={items}
      keyExtractor={(enrollment) => enrollment.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <EmptyView title="No enrollments" message={isAdmin ? undefined : 'Requests you make will show up here.'} />
      }
      renderItem={({ item }) => (
        <ListRow
          title={`${item.courseCode} · ${item.courseTitle}`}
          subtitle={isAdmin ? `${item.studentName} (${item.studentId})` : item.term}
          meta={`${item.credits} credits · requested ${item.enrolledAt ?? '-'}`}
          right={<StatusBadge status={item.status} />}
        />
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
})
