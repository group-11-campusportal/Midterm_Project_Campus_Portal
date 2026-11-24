import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font, radii, shadow, spacing } from '../theme'

// Shared bottom sheet for the small admin/student forms (edit grade, course form).
// Same keyboard handling as RecordGradeModal: on Android the modal is edge-to-edge, so the sheet
// is lifted by the keyboard height to keep the inputs and the footer buttons visible.
export default function BottomSheet({ visible, onClose, title, subtitle, icon = 'create-outline', busy, footer, children }) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const lift = Dimensions.get('screen').height - event.endCoordinates.screenY
      setKeyboardHeight(Math.max(event.endCoordinates.height, lift))
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  const close = () => { if (!busy) onClose() }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              {
                maxHeight: (height - keyboardHeight) * 0.92,
                marginBottom: keyboardHeight,
                paddingBottom: keyboardHeight ? spacing.sm : Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name={icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={close} hitSlop={12} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export function SheetField({ label, error, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

export function SheetMessage({ tone = 'danger', children }) {
  const danger = tone === 'danger'
  return (
    <View style={[styles.message, danger ? styles.messageDanger : styles.messageWarning]} accessibilityRole="alert">
      <Ionicons name={danger ? 'alert-circle' : 'warning'} size={16} color={danger ? colors.danger : colors.warning} />
      <Text style={[styles.messageText, { color: danger ? colors.danger : colors.text }]}>{children}</Text>
    </View>
  )
}

export const sheetInput = {
  minHeight: 50,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
  fontSize: font.body + 1,
  color: colors.text,
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    ...shadow.md,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textSecondary, lineHeight: 18 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  field: { gap: 6 },
  fieldLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.muted },
  error: { fontSize: font.small, fontWeight: '600', color: colors.danger },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm },
  messageDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  messageWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
  messageText: { flex: 1, fontSize: font.small, fontWeight: '600' },
})
