import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { colors, font, gradients, radii, shadow, spacing } from '../theme'

export default function StatCard({ label, value, hint, color, iconName, iconColor, iconBg }) {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow.sm]}
    >
      {/* Subtle organic watermark curve */}
      <View style={styles.watermarkCurve} />

      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {iconName ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg || colors.primarySoft }]}>
            <Ionicons name={iconName} size={15} color={iconColor || colors.primary} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
      {hint ? (
        <View style={styles.hintWrap}>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      ) : null}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'space-between',
    minHeight: 104,
  },
  watermarkCurve: {
    position: 'absolute',
    right: -20,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.05)',
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: font.small,
    color: colors.muted,
    fontWeight: '600',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: font.display,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  hintWrap: {
    marginTop: 4,
  },
  hint: {
    fontSize: font.xs,
    color: colors.warning,
    fontWeight: '600',
  },
})
