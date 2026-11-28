import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '../lib/api'
import { parseScore, previewGrade } from '../lib/grading'
import { colors, font, minTap, radii, spacing } from '../theme'
import BottomSheet, { SheetField, SheetMessage, sheetInput } from './BottomSheet'
import PrimaryButton from './PrimaryButton'

// Administrator: change or delete one grade. Same rules as the web EditGradeModal:
// PUT /api/grades/:id { score }, DELETE /api/grades/:id; the server computes letter and points.
export default function EditGradeSheet({ grade, onClose, onChanged }) {
  const [scoreText, setScoreText] = useState(grade ? String(grade.score) : '')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!grade) return null
  const score = parseScore(scoreText)
  const preview = score === null ? null : previewGrade(score)

  async function run(action, message) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged?.(message)
      onClose()
    } catch (failure) {
      if (failure.status !== 401) setError(failure.message || 'The change could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (score === null) {
      setError('Score must be a number from 0 to 100, with at most 2 decimals.')
      return
    }
    run(() => api.updateGrade(grade.id, score), `Grade for ${grade.studentName} in ${grade.courseCode} updated to ${preview.letter}.`)
  }

  return (
    <BottomSheet
      visible
      onClose={onClose}
      busy={busy}
      title="Edit Grade"
      subtitle={`${grade.studentName} · ${grade.studentId}\n${grade.courseCode} ${grade.courseTitle} · Term ${grade.term}`}
      footer={confirmDelete ? (
        <>
          <PrimaryButton title={busy ? 'Deleting…' : 'Yes, delete grade'} busy={busy} variant="danger"
            onPress={() => run(() => api.deleteGrade(grade.id), `Grade for ${grade.studentName} in ${grade.courseCode} deleted.`)} />
          <PrimaryButton title="Keep grade" variant="outline" onPress={() => setConfirmDelete(false)} disabled={busy} />
        </>
      ) : (
        <>
          <PrimaryButton title={busy ? 'Saving…' : 'Save grade'} variant="gradient" busy={busy} disabled={score === null} onPress={save} />
          <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteLink} accessibilityRole="button">
            <Text style={styles.deleteText}>Delete grade</Text>
          </Pressable>
        </>
      )}
    >
      <View style={styles.compare}>
        <View style={styles.compareCol}>
          <Text style={styles.compareLabel}>CURRENT</Text>
          <Text style={styles.compareValue}>{grade.letter} · {grade.score}</Text>
        </View>
        <View style={styles.compareCol}>
          <Text style={styles.compareLabel}>NEW</Text>
          <Text style={[styles.compareValue, { color: colors.primary }]}>{preview ? `${preview.letter} · ${score}` : '—'}</Text>
        </View>
      </View>
      <SheetField label="Raw Score (0–100)">
        <TextInput
          value={scoreText}
          onChangeText={(text) => { setScoreText(text); setError(null) }}
          keyboardType="decimal-pad"
          maxLength={6}
          style={sheetInput}
          accessibilityLabel="New raw score from 0 to 100"
        />
      </SheetField>
      {confirmDelete ? (
        <SheetMessage tone="warning">
          Delete this grade? The enrollment stays approved and shows up again in the &quot;no grade yet&quot; list.
        </SheetMessage>
      ) : null}
      {error ? <SheetMessage>{error}</SheetMessage> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  compare: { flexDirection: 'row', gap: spacing.sm },
  compareCol: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: 2 },
  compareLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.muted },
  compareValue: { fontSize: font.title, fontWeight: '800', color: colors.text },
  deleteLink: { minHeight: minTap - 8, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: font.body, fontWeight: '700', color: colors.danger },
})
