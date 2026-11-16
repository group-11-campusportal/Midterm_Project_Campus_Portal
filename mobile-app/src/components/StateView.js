import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, font, spacing } from '../theme'
import PrimaryButton from './PrimaryButton'

// One place for the three non-data states every list screen has.
export function LoadingView({ label = 'Loading…' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  )
}

export function ErrorView({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? <View style={styles.action}><PrimaryButton title="Try again" onPress={onRetry} /></View> : null}
    </View>
  )
}

export function EmptyView({ title, message }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.muted}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: font.title, fontWeight: '600', color: colors.text, textAlign: 'center' },
  muted: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
})
