import { StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'

const badgeColors = {
  approved: colors.success,
  pending: colors.warning,
  rejected: colors.danger,
}

export function StatusBadge({ status }) {
  const color = badgeColors[status] || colors.muted
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  )
}

export default function ListRow({ title, subtitle, meta, right }) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1, gap: spacing.xs },
  title: { fontSize: font.body, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: font.small, color: colors.muted },
  meta: { fontSize: font.small, color: colors.muted },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: font.small, fontWeight: '600', textTransform: 'capitalize' },
})
