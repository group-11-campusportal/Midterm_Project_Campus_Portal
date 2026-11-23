import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../../components/PrimaryButton'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../lib/config'
import { colors, font, gradients, radii, shadow, spacing } from '../../theme'

export default function ProfileScreen() {
  const { user, gpa, signOut } = useAuth()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)

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

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sleek Modern Header with Fluid Wave Contour */}
      <View style={styles.headerSection}>
        <LinearGradient
          colors={isStudent ? gradients.hero : gradients.heroAdmin}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBackground}
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
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active Session</Text>
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
              <View style={styles.idCardIconButton}>
                <Ionicons name="qr-code-outline" size={20} color="#93c5fd" />
              </View>
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
                  {isStudent ? 'Undergraduate' : 'Staff Administrator'}
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
        {/* Modern 2-Tile Grid for Academic Standing & Progress */}
        {isStudent ? (
          <View style={styles.tilesRow}>
            <View style={[styles.tileCard, shadow.sm]}>
              <View style={styles.tileIconWrapBlue}>
                <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.tileTextWrap}>
                <Text style={styles.tileLabel}>Cumulative GPA</Text>
                <Text style={styles.tileValue}>{gpaValue}</Text>
                <Text style={styles.tileSub}>Dean's List Honors</Text>
              </View>
            </View>

            <View style={[styles.tileCard, shadow.sm]}>
              <View style={styles.tileIconWrapGreen}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.success} />
              </View>
              <View style={styles.tileTextWrap}>
                <Text style={styles.tileLabel}>Degree Progress</Text>
                <Text style={styles.tileValue}>84 / 144</Text>
                <Text style={styles.tileSub}>SKS Credits Completed</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Academic Services & Account Menu */}
        <View style={[styles.card, shadow.sm, { paddingVertical: spacing.xs }]}>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Academic Transcripts & Records</Text>
                <Text style={styles.menuItemSub}>Official certified grades and reports</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Study Plan & Course Registrations</Text>
                <Text style={styles.menuItemSub}>Active term schedule and courses</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Tuition & Student Account</Text>
                <Text style={styles.menuItemSub}>Account balance: Cleared ($0.00)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => setShowSecurityDetails(!showSecurityDetails)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Security & Keystore Architecture</Text>
                <Text style={styles.menuItemSub}>Hardware keystore · AES-256 encrypted</Text>
              </View>
            </View>
            <Ionicons
              name={showSecurityDetails ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.muted}
            />
          </Pressable>

          {showSecurityDetails ? (
            <View style={styles.securityBox}>
              <View style={styles.securityRow}>
                <Ionicons name="server-outline" size={14} color={colors.muted} />
                <Text style={styles.securityText}>API: {API_URL || 'Not configured (.env)'}</Text>
              </View>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                <Text style={styles.securityText}>Keystore: expo-secure-store (Hardware-backed)</Text>
              </View>
              <View style={styles.securityRow}>
                <Ionicons name="cube-outline" size={14} color={colors.primary} />
                <Text style={styles.securityText}>Runtime: React Native & Expo SDK 58</Text>
              </View>
            </View>
          ) : null}
        </View>

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
