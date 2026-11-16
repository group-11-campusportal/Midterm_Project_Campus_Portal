import { FlatList, RefreshControl, StyleSheet } from 'react-native'
import ListRow from '../../components/ListRow'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, spacing } from '../../theme'

export default function CoursesScreen() {
  const { items, error, refreshing, reload, refresh } = useApiList(api.courses)

  if (!items && error) return <ErrorView message={error} onRetry={reload} />
  if (!items) return <LoadingView label="Loading courses…" />

  return (
    <FlatList
      data={items}
      keyExtractor={(course) => course.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyView title="No courses yet" />}
      renderItem={({ item }) => (
        <ListRow
          title={`${item.code} · ${item.title}`}
          subtitle={`${item.instructor} · ${item.term}`}
          meta={`${item.credits} credits · ${item.enrolled}/${item.capacity} seats taken`}
        />
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
})
