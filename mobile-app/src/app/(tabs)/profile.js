import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import PrimaryButton from '../../components/PrimaryButton'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../lib/config'
import { colors, font, radius, spacing } from '../../theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    await signOut() // clears secure-store; the router guard shows /login
  }

  const rows = user?.role === 'client'
    ? [['Student ID', user.studentId], ['Program', user.program], ['Year', user.year]]
    : [['Staff ID', user?.staffId], ['Title', user?.title], ['Department', user?.department]]

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name ?? 'Offline'}</Text>
        <Text style={styles.muted}>{user ? `${user.username} · ${user.email}` : 'Could not reach the server.'}</Text>
        {user ? rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={styles.value}>{value ?? '-'}</Text>
          </View>
        )) : null}
      </View>
      <Text style={styles.server}>Server: {API_URL || 'not set'}</Text>
      <PrimaryButton title="Log out" variant="outline" onPress={handleLogout} busy={busy} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  name: { fontSize: font.title, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { fontSize: font.body, color: colors.muted },
  value: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  server: { fontSize: font.small, color: colors.muted },
})
