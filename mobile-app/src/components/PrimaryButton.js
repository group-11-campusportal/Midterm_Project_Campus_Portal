import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, font, minTap, radius, spacing } from '../theme'

// Busy = disabled: one tap sends one request (S49). Ramadhan (D4) owns the final styling.
export default function PrimaryButton({ title, onPress, busy = false, disabled = false, variant = 'primary' }) {
  const inactive = busy || disabled
  const outline = variant === 'outline'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.solid,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {busy
        ? <ActivityIndicator color={outline ? colors.primary : colors.primaryText} />
        : <Text style={[styles.label, outline && styles.outlineLabel]}>{title}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTap,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  inactive: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  label: { color: colors.primaryText, fontSize: font.body, fontWeight: '600' },
  outlineLabel: { color: colors.primary },
})
