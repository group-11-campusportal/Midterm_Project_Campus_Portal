import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { colors, font, gradients, radii, shadow, spacing } from '../theme'

const badgeStyles = {
  approved: {
    bg: colors.successSoft,
    text: colors.success,
    border: colors.successBorder,
    icon: 'checkmark-circle',
  },
  pending: {
    bg: colors.warningSoft,
    text: colors.warning,
    border: colors.warningBorder,
    icon: 'time',
  },
  rejected: {
    bg: colors.dangerSoft,
    text: colors.danger,
    border: colors.dangerBorder,
    icon: 'close-circle',
  },
  default: {
    bg: colors.primarySoft,
    text: colors.primaryDark,
    border: colors.primaryMuted,
    icon: 'information-circle',
  },
}

export function StatusBadge({ status, showIcon = true }) {
  const safeStatus = (status || 'pending').toLowerCase()
  const style = badgeStyles[safeStatus] || badgeStyles.default
  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      {showIcon ? (
        <Ionicons name={style.icon} size={12} color={style.text} style={styles.badgeIcon} />
      ) : null}
      <Text style={[styles.badgeText, { color: style.text }]}>{safeStatus}</Text>
    </View>
  )
}

export default function ListRow({
  title,
  subtitle,
  meta,
  right,
  icon,
  badgeText,
  badgeColor,
  progress, // { current, max } for capacity indicator
}) {
  const ratio = progress ? Math.min(1, Math.max(0, progress.current / (progress.max || 1))) : null
  const isFull = progress && progress.current >= progress.max

  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.row, shadow.sm]}
    >
      {/* Decorative Wave Watermark */}
      <View style={styles.cardWatermark} />

      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          {badgeText ? (
            <View style={[styles.tagBadge, badgeColor ? { backgroundColor: badgeColor } : null]}>
              <Text style={styles.tagText}>{badgeText}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}

        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {/* Visual Progress Bar for Course Seats */}
        {progress ? (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(ratio * 100)}%`,
                    backgroundColor: isFull ? colors.danger : ratio > 0.75 ? colors.warning : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, isFull && styles.progressFull]}>
              {progress.current} / {progress.max} seats
            </Text>
          </View>
        ) : null}
      </View>
      {right}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardWatermark: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.04)',
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: font.xs,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  title: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  subtitle: {
    fontSize: font.small,
    color: colors.muted,
    lineHeight: 18,
  },
  meta: {
    fontSize: font.xs,
    color: colors.mutedLight,
    fontWeight: '500',
  },
  progressSection: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: font.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  progressFull: {
    color: colors.danger,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeIcon: {
    marginRight: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
})
