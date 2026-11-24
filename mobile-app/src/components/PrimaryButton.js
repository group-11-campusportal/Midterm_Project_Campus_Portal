import { LinearGradient } from 'expo-linear-gradient'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../theme'

export default function PrimaryButton({
  title,
  onPress,
  busy = false,
  disabled = false,
  variant = 'primary', // 'primary' | 'gradient' | 'outline' | 'ghost' | 'danger'
  icon,
}) {
  const inactive = busy || disabled
  const isOutline = variant === 'outline'
  const isGradient = variant === 'gradient'
  const isGhost = variant === 'ghost'

  const content = (
    <View style={styles.innerContent}>
      {busy ? (
        <ActivityIndicator color={isOutline || isGhost ? colors.primary : colors.primaryText} />
      ) : (
        <>
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              (isOutline || isGhost) && styles.outlineLabel,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  )

  if (isGradient) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy }}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          inactive && styles.inactive,
          pressed && !inactive && styles.pressed,
          shadow.glow,
        ]}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : isGhost ? styles.ghost : variant === 'danger' ? styles.danger : styles.solid,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        !isOutline && !isGhost && shadow.glow,
      ]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTap,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  gradient: {
    minHeight: minTap,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    marginRight: 2,
  },
  inactive: { opacity: 0.6 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  label: { color: colors.primaryText, fontSize: font.body, fontWeight: '700', letterSpacing: 0.2 },
  outlineLabel: { color: colors.primary },
})
