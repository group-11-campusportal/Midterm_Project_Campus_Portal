import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'
import { apiUrlProblem } from '../lib/config'
import { colors, font, gradients, minTap, radii, shadow, spacing } from '../theme'

const DEMO_ACCOUNTS = [
  { role: 'Student', username: 'andi', password: 'student123', label: 'Andi (Student)' },
  { role: 'Student', username: 'bella', password: 'student123', label: 'Bella (Student)' },
  { role: 'Administrator', username: 'admin', password: 'admin123', label: 'System Admin' },
]

export default function LoginScreen() {
  const { signIn } = useAuth()
  const insets = useSafeAreaInsets()
  const passwordRef = useRef(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(apiUrlProblem())
  const [isSubmitting, setIsSubmitting] = useState(false)

  function fillDemo(acc) {
    setUsername(acc.username)
    setPassword(acc.password)
    setFieldErrors({})
    setFormError(null)
  }

  async function handleLogin() {
    if (isSubmitting) return
    const errors = {}
    if (!username.trim()) errors.username = 'Username is required.'
    if (!password) errors.password = 'Password is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setFormError(null)
    setIsSubmitting(true)
    try {
      await signIn(username.trim(), password)
    } catch (error) {
      setFormError(
        error.status === 401
          ? 'Invalid username or password. Check your credentials and try again.'
          : error.message,
      )
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Gradient Hero Top */}
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroTop}
        >
          <View style={styles.decoCircle} />
          <View style={styles.waveOverlay} />

          <View style={styles.logoWrap}>
            <Ionicons name="school" size={32} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>Campus Portal</Text>
          <Text style={styles.brandSubtitle}>
            University Grades & Enrollment System
          </Text>
        </LinearGradient>

        <View style={styles.formSection}>
          {/* Sign In Card */}
          <View style={[styles.card, shadow.md]}>
            <View style={styles.cardHeader}>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>
                Enter your university credentials to continue.
              </Text>
            </View>

            {formError ? (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.alertText}>{formError}</Text>
              </View>
            ) : null}

            {/* Username Field with Left Icon */}
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <View
                style={[
                  styles.inputWrap,
                  fieldErrors.username && styles.inputErrorWrap,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  placeholder="e.g. admin or andi"
                  placeholderTextColor={colors.mutedLight}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!isSubmitting}
                />
              </View>
              {fieldErrors.username ? (
                <Text style={styles.error}>{fieldErrors.username}</Text>
              ) : null}
            </View>

            {/* Password Field with Left Icon */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  fieldErrors.password && styles.inputErrorWrap,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  placeholder="Your password"
                  placeholderTextColor={colors.mutedLight}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!isSubmitting}
                />
              </View>
              {fieldErrors.password ? (
                <Text style={styles.error}>{fieldErrors.password}</Text>
              ) : null}
            </View>

            <View style={styles.actionWrap}>
              <PrimaryButton
                variant="gradient"
                title={isSubmitting ? 'Signing in…' : 'Sign in to Portal'}
                onPress={handleLogin}
                busy={isSubmitting}
                icon={<Ionicons name="arrow-forward" size={18} color="#ffffff" />}
              />
            </View>

            {/* Interactive Demo Accounts Tap-to-Fill */}
            <View style={styles.demoSection}>
              <View style={styles.demoHead}>
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={styles.demoTitle}>Quick Demo Sign In</Text>
                <Text style={styles.demoHint}>tap to fill</Text>
              </View>

              <View style={styles.demoList}>
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = username === acc.username
                  const isAdminRole = acc.role === 'Administrator'
                  return (
                    <Pressable
                      key={acc.username}
                      onPress={() => fillDemo(acc)}
                      style={({ pressed }) => [
                        styles.demoPill,
                        isSelected && styles.demoPillActive,
                        pressed && styles.demoPillPressed,
                      ]}
                    >
                      <View style={styles.demoLeft}>
                        <View
                          style={[
                            styles.roleDot,
                            {
                              backgroundColor: isAdminRole
                                ? colors.purple
                                : colors.primary,
                            },
                          ]}
                        />
                        <Text style={styles.demoName}>{acc.label}</Text>
                      </View>
                      <Text style={styles.demoCreds}>
                        {acc.username} / {acc.password}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, backgroundColor: colors.background },
  heroTop: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  decoCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  waveOverlay: {
    position: 'absolute',
    left: -50,
    right: -50,
    bottom: -60,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  sparkle1: {
    position: 'absolute',
    top: 36,
    right: 48,
    color: '#fde047',
    fontSize: 18,
  },
  sparkle2: {
    position: 'absolute',
    top: 75,
    left: 40,
    color: '#ffffff',
    fontSize: 13,
    opacity: 0.8,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 40,
    right: 70,
    color: '#fde047',
    fontSize: 15,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: font.small,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: spacing.md,
    marginTop: -spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { gap: 2, marginBottom: 2 },
  formTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.text,
  },
  formSubtitle: {
    fontSize: font.small,
    color: colors.muted,
  },
  field: { gap: 6 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTap,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.md,
  },
  inputErrorWrap: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: font.body,
    color: colors.text,
    minHeight: minTap,
  },
  error: { fontSize: font.xs, color: colors.danger, fontWeight: '600' },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  alertText: { fontSize: font.small, color: colors.danger, flex: 1, fontWeight: '500' },
  actionWrap: { marginTop: 4 },
  demoSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  demoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoTitle: {
    fontSize: font.xs,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoHint: {
    fontSize: font.xs,
    color: colors.primary,
    marginLeft: 'auto',
    fontWeight: '600',
  },
  demoList: { gap: 6 },
  demoPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  demoPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  demoPillPressed: { opacity: 0.75 },
  demoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  demoName: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.text,
  },
  demoCreds: {
    fontSize: font.xs,
    color: colors.muted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
})
