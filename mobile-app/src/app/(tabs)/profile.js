import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../../components/PrimaryButton'
import ProfileQr, { profileQrText } from '../../components/ProfileQr'
import { useAuth } from '../../context/AuthContext'
import { colors, font, gradients, radii, shadow, spacing } from '../../theme'

// Same links as the web Profile page. Feedback opens the phone's mail app (Gmail / Outlook).
const FEEDBACK_URL = 'mailto:01881250031@student.uph.edu?subject=Campus%20Portal%20Feedback'

// Same colours as the web icons (.quick-service-icon--* in src/index.css).
const SERVICE_TONES = {
  orange: { bg: '#fff7ed', fg: '#ea580c' },
  blue: { bg: '#eff6ff', fg: '#2563eb' },
  green: { bg: '#ecfdf5', fg: '#059669' },
  purple: { bg: '#f5f3ff', fg: '#7c3aed' },
}

export default function ProfileScreen() {
  const { user, gpa, signOut } = useAuth()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  const isStudent = user?.role !== 'administrator'

  const displayName = user?.name || '—'
  const displayId = user?.studentId || user?.staffId || '—'
  const displayProgram = user?.program || user?.department || '—'
  const displayYear = user?.year ? `Year ${user.year}` : (user?.title || '—')

  const gpaValue = gpa != null && Number(gpa) > 0 ? Number(gpa).toFixed(2) : '—'
  const numericGpa = Number(gpa) || 0
  const standing = numericGpa <= 0 ? 'No grades recorded yet'
    : numericGpa >= 3.5 ? "Dean's List · First Class Standing"
      : numericGpa >= 3.0 ? 'Good Academic Standing' : 'Satisfactory Standing'
  const identityRows = isStudent
    ? [['Student ID', user?.studentId], ['Program', user?.program],
        ['Academic Year', user?.year ? `Year ${user.year}` : null], ['Campus Email', user?.email],
        ['Username', user?.username]]
    : [['Staff ID', user?.staffId], ['Title', user?.title], ['Department', user?.department],
        ['Email', user?.email], ['Username', user?.username]]

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Sleek Modern Header with Fluid Wave Contour */}
      <View style={styles.headerSection}>
        <LinearGradient
          colors={isStudent ? gradients.hero : gradients.heroAdmin}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBackground, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.waveOverlay} />

          {/* Top Title Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.portalBadge}>
                <Ionicons name="school-outline" size={14} color="#ffffff" />
                <Text style={styles.portalBadgeText}>Campus Portal</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Floating Modern Student Identity Card */}
        <View style={styles.idCardOuter}>
          <LinearGradient
            colors={isStudent ? ['#1e40af', '#1e3a8a', '#0f172a'] : ['#1e293b', '#0f172a', '#020617']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.idCard, shadow.glow]}
          >
            {/* Watermark inner contour */}
            <View style={styles.idCardContour} />

            {/* Overlapping Avatar Circle */}
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            {/* Top Bar with QR and Settings icons */}
            <View style={styles.idCardTopIcons}>
              <Pressable
                style={styles.idCardIconButton}
                onPress={() => setQrOpen(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Show my profile QR code"
              >
                <Ionicons name="qr-code-outline" size={20} color="#93c5fd" />
              </Pressable>
              <View style={styles.idCardIconButton}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#93c5fd" />
              </View>
            </View>

            {/* Student Name & ID */}
            <View style={styles.idCardCenter}>
              <Text style={styles.idCardName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.idPill}>
                <Text style={styles.idNumber}>{displayId}</Text>
                <View style={styles.idPillDot} />
                <Text style={styles.idRole}>
                  {isStudent ? 'Student' : 'Administrator'}
                </Text>
              </View>
            </View>

            {/* 3-Column Academic Overview */}
            <View style={styles.metadataDivider}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>INSTITUTION</Text>
                <Text style={styles.metaValue} numberOfLines={1}>Campus Portal</Text>
              </View>
              <View style={styles.metaColBorder} />
              <View style={[styles.metaCol, { flex: 1.4 }]}>
                <Text style={styles.metaLabel}>PROGRAM</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{displayProgram}</Text>
              </View>
              <View style={styles.metaColBorder} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>STANDING</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{displayYear}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Main Content Tiles */}
      <View style={styles.contentWrap}>
        {/* Same facts as the web profile card (src/pages/Dashboard.jsx): Identity & Credentials. */}
        {isStudent ? (
          <View style={[styles.tileCard, shadow.sm]}>
            <View style={styles.tileIconWrapBlue}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.tileTextWrap}>
              <Text style={styles.tileLabel}>Cumulative GPA</Text>
              <Text style={styles.tileValue}>{gpaValue}</Text>
              <Text style={styles.tileSub}>{standing}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.card, shadow.sm]}>
          <Text style={styles.identityTitle}>Identity & Credentials</Text>
          <Text style={styles.identitySub}>From your university account</Text>
          {identityRows.map(([label, value], index) => (
            <View key={label} style={[styles.identityRow, index > 0 && styles.identityRowBorder]}>
              <Text style={styles.identityLabel}>{label}</Text>
              <Text style={styles.identityValue} numberOfLines={2}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Academic Services: same shortcuts as the web Profile page (src/pages/Profile.jsx). */}
        <View style={[styles.card, shadow.sm]}>
          <Text style={styles.identityTitle}>Academic Services</Text>
          <Text style={styles.identitySub}>Campus apps, feedback and collaboration tools</Text>
          <Text style={styles.serviceGroup}>CAMPUS LINKS & TOOLS</Text>
          {[
            ['book-outline', 'LMS / Moodle', 'Lecture slides & assignments', 'https://learn.uph.edu/', 'orange'],
            ['library-outline', 'Digital Library', 'Journals, e-books & research', 'https://library.uph.edu', 'blue'],
            ['chatbox-outline', 'Feedback', 'Email us to help improve the Campus Portal', FEEDBACK_URL, 'green'],
            ['people-outline', 'Collaboration Tools', 'Collaborate in Microsoft Teams', 'https://teams.microsoft.com', 'purple'],
          ].map(([icon, title, sub, url, tone]) => (
            <Pressable
              key={title}
              onPress={() => Linking.openURL(url)}
              style={({ pressed }) => [styles.serviceRow, pressed && styles.servicePressed]}
              accessibilityRole="link"
            >
              <View style={[styles.serviceIcon, { backgroundColor: SERVICE_TONES[tone].bg }]}>
                <Ionicons name={icon} size={18} color={SERVICE_TONES[tone].fg} />
              </View>
              <View style={styles.serviceText}>
                <Text style={styles.serviceTitle}>{title}</Text>
                <Text style={styles.serviceSub}>{sub}</Text>
              </View>
              <View style={styles.externalBadge}><Text style={styles.externalText}>{url.startsWith('mailto:') ? 'Email' : 'External'}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {/* Profile QR: same content as the web Profile page. */}
        <Pressable
          onPress={() => setQrOpen(true)}
          style={({ pressed }) => [styles.card, shadow.sm, styles.qrRow, pressed && styles.servicePressed]}
          accessibilityRole="button"
        >
          <View style={[styles.serviceIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.serviceText}>
            <Text style={styles.serviceTitle}>My Profile QR</Text>
            <Text style={styles.serviceSub}>Show it to the registrar to identify yourself</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <Modal visible={qrOpen} transparent animationType="fade" onRequestClose={() => setQrOpen(false)}>
          <Pressable style={styles.qrBackdrop} onPress={() => setQrOpen(false)}>
            <Pressable style={styles.qrCard} onPress={() => {}}>
              <Text style={styles.qrTitle}>{displayName}</Text>
              <Text style={styles.qrSub}>{displayId} · {isStudent ? 'Student' : 'Administrator'}</Text>
              <View style={styles.qrBox}>
                <ProfileQr value={profileQrText(user)} size={220} />
              </View>
              <Text style={styles.qrNote}>Contains your name and ID only. No password or session token.</Text>
              <PrimaryButton title="Close" variant="outline" onPress={() => setQrOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>

        {/* Sign Out Action Button */}
        <View style={styles.signOutWrap}>
          <PrimaryButton
            title="Sign Out of Campus Portal"
            variant="outline"
            onPress={handleSignOut}
            busy={busy}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
          />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qrBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  qrCard: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, alignItems: 'stretch' },
  qrTitle: { fontSize: font.title, fontWeight: '800', color: colors.text, textAlign: 'center' },
  qrSub: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  qrBox: { alignSelf: 'center', padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, marginVertical: spacing.sm },
  qrNote: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: spacing.xs },
  serviceGroup: { marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.muted },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56, paddingVertical: spacing.sm },
  servicePressed: { opacity: 0.7 },
  serviceIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  serviceText: { flex: 1, gap: 2 },
  externalBadge: { backgroundColor: colors.borderLight, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  externalText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  serviceTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  serviceSub: { fontSize: font.small, color: colors.muted },
  identityTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  identitySub: { fontSize: font.small, color: colors.muted, marginBottom: spacing.xs },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10 },
  identityRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  identityLabel: { fontSize: font.small, color: colors.muted },
  identityValue: { flex: 1, textAlign: 'right', fontSize: font.small, fontWeight: '700', color: colors.text },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    position: 'relative',
    marginBottom: 20,
  },
  heroBackground: {
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: 85,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  waveOverlay: {
    position: 'absolute',
    left: -50,
    right: -50,
    bottom: -80,
    height: 180,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  portalBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  statusText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  idCardOuter: {
    paddingHorizontal: spacing.md,
    marginTop: -68,
    zIndex: 10,
  },
  idCard: {
    borderRadius: radii.xl,
    paddingTop: 36,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    position: 'relative',
    overflow: 'visible',
  },
  idCardContour: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -60,
    height: 140,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    position: 'absolute',
    top: -34,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    padding: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  idCardTopIcons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    position: 'absolute',
    top: 14,
    left: spacing.md,
    right: spacing.md,
  },
  idCardIconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardCenter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 6,
  },
  idCardName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  idNumber: {
    color: '#93c5fd',
    fontSize: font.small,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  idPillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#93c5fd',
  },
  idRole: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '500',
  },
  metadataDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  metaColBorder: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  metaLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metaValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  contentWrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tileCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tileIconWrapBlue: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconWrapGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextWrap: {
    gap: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  tileSub: {
    fontSize: font.xs,
    color: colors.muted,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextWrap: {
    gap: 2,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuItemSub: {
    fontSize: font.xs,
    color: colors.muted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  securityBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 6,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: font.xs,
    color: colors.muted,
    fontFamily: font.mono,
  },
  signOutWrap: {
    marginTop: 4,
  },
})
