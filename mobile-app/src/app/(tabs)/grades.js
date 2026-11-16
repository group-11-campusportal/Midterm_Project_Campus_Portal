import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import ListRow from '../../components/ListRow'
import { EmptyView, ErrorView, LoadingView } from '../../components/StateView'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { useApiList } from '../../lib/useApiList'
import { colors, font, radius, spacing } from '../../theme'

export default function GradesScreen() {
  const { user, gpa } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const { items, error, refreshing, reload, refresh } = useApiList(api.grades)

  if (!items && error) return <ErrorView message={error} onRetry={reload} />
  if (!items) return <LoadingView label="Loading grades…" />

  return (
    <FlatList
      data={items}
      keyExtractor={(grade) => grade.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={!isAdmin && gpa != null ? <GpaCard gpa={gpa} /> : null}
      ListEmptyComponent={<EmptyView title="No grades yet" />}
      renderItem={({ item }) => (
        <ListRow
          title={`${item.courseCode} · ${item.courseTitle}`}
          subtitle={isAdmin ? `${item.studentName} (${item.studentId})` : item.term}
          meta={`${item.credits} credits · score ${item.score}`}
          right={<Text style={styles.letter}>{item.letter ?? '-'}</Text>}
        />
      )}
    />
  )
}

function GpaCard({ gpa }) {
  const value = typeof gpa === 'number' ? gpa.toFixed(2) : String(gpa)
  return (
    <View style={styles.gpa}>
      <Text style={styles.gpaLabel}>GPA</Text>
      <Text style={styles.gpaValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  letter: { fontSize: font.title, fontWeight: '700', color: colors.primary, minWidth: 32, textAlign: 'center' },
  gpa: { backgroundColor: colors.primary, borderRadius: radius, padding: spacing.md, marginBottom: spacing.sm },
  gpaLabel: { color: colors.primaryText, fontSize: font.small },
  gpaValue: { color: colors.primaryText, fontSize: font.heading, fontWeight: '700' },
})
