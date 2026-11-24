import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, minTap, radii, shadow, spacing } from '../theme'
import { StatusBadge } from './ListRow'

// One course offering in the catalog. Everything (status, action) sits inside the card so the
// list reads as one card per course. `status` is the student's own request status, if any.
export default function CourseCard({ course, status, onPress, showAction = true }) {
  const seatsLeft = Math.max(0, course.capacity - course.enrolled)
  const isFull = seatsLeft === 0
  const ratio = Math.min(1, course.enrolled / (course.capacity || 1))
  const barColor = isFull ? colors.danger : ratio > 0.8 ? colors.warning : colors.primary

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${course.code} ${course.title}, ${isFull ? 'full' : `${seatsLeft} seats left`}`}
      style={({ pressed }) => [styles.card, shadow.sm, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{course.code}</Text>
        </View>
        <Text style={styles.credits}>{course.credits} SKS</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={13} color={colors.muted} />
        <Text style={styles.meta} numberOfLines={1}>{course.instructor}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>Term {course.term}</Text>
      </View>

      <View style={styles.seatTrack}>
        <View style={[styles.seatFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.seatRow}>
        <Text style={[styles.seatText, isFull && styles.seatFull]}>
          {isFull ? 'Class full' : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`}
        </Text>
        <Text style={styles.seatText}>{course.enrolled} / {course.capacity} approved</Text>
      </View>

      {showAction ? (
        <View style={styles.footer}>
          {status ? (
            <>
              <Text style={styles.footerNote}>Your request</Text>
              <StatusBadge status={status} />
            </>
          ) : isFull ? (
            <>
              <Text style={styles.footerNote}>No seats available</Text>
              <Text style={styles.fullLabel}>Full</Text>
            </>
          ) : (
            <>
              <Text style={styles.footerNote}>Open for enrollment</Text>
              <View style={styles.enrollButton}>
                <Text style={styles.enrollText}>View & Enroll</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.primaryText} />
              </View>
            </>
          )}
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  pressed: { opacity: 0.9 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  credits: { fontSize: 12, fontWeight: '700', color: colors.muted },
  title: { fontSize: font.body + 1, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: font.small, color: colors.textSecondary, flexShrink: 1 },
  metaDot: { fontSize: font.small, color: colors.mutedLight },
  seatTrack: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, overflow: 'hidden', marginTop: 4 },
  seatFill: { height: '100%', borderRadius: 3 },
  seatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  seatText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  seatFull: { color: colors.danger },
  footer: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerNote: { fontSize: font.small, color: colors.muted },
  fullLabel: { fontSize: font.small, fontWeight: '700', color: colors.danger },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: minTap - 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  enrollText: { fontSize: font.small, fontWeight: '700', color: colors.primaryText },
})
