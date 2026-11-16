import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'
import { apiUrlProblem } from '../lib/config'
import { colors, font, minTap, radius, spacing } from '../theme'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const insets = useSafeAreaInsets()
  const passwordRef = useRef(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(apiUrlProblem())
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin() {
    if (isSubmitting) return // one tap = one request
    const errors = {}
    if (!username.trim()) errors.username = 'Enter your username.'
    if (!password) errors.password = 'Enter your password.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setFormError(null)
    setIsSubmitting(true)
    try {
      await signIn(username.trim(), password)
      // The router guard swaps to the tabs automatically; nothing to navigate here.
    } catch (error) {
      setFormError(error.status === 401 ? 'Wrong username or password.' : error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Campus Portal</Text>
        <Text style={styles.subheading}>Log in to see your courses, enrollments and grades.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, fieldErrors.username && styles.inputError]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isSubmitting}
          />
          {fieldErrors.username ? <Text style={styles.error}>{fieldErrors.username}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={[styles.input, fieldErrors.password && styles.inputError]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!isSubmitting}
          />
          {fieldErrors.password ? <Text style={styles.error}>{fieldErrors.password}</Text> : null}
        </View>

        {/* Errors sit on the form, never in a pop-up that hides it (S49). */}
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <PrimaryButton title="Log in" onPress={handleLogin} busy={isSubmitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  heading: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  subheading: { fontSize: font.body, color: colors.muted, marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  input: {
    minHeight: minTap,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: font.small, color: colors.danger },
  formError: { fontSize: font.body, color: colors.danger },
})
