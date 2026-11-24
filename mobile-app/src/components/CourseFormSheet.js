import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '../lib/api'
import { colors, font, minTap, spacing } from '../theme'
import BottomSheet, { SheetField, SheetMessage, sheetInput } from './BottomSheet'
import PrimaryButton from './PrimaryButton'

// Same limits as backend/src/validation.js (courseInput) and the web CourseFormModal.
function validate(form) {
  const errors = {}
  const text = (key, label, max) => {
    const value = form[key].trim()
    if (!value) errors[key] = `${label} is required.`
    else if (value.length > max) errors[key] = `${label} must be at most ${max} characters.`
  }
  text('code', 'Course code', 30)
  text('title', 'Title', 200)
  text('term', 'Term', 40)
  text('instructor', 'Instructor', 200)
  const credits = Number(form.credits)
  if (!Number.isInteger(credits) || credits < 1 || credits > 12) errors.credits = 'Whole number from 1 to 12.'
  const capacity = Number(form.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Whole number, at least 1.'
  return errors
}

// Administrator: add, edit or delete a course offering (POST / PUT / DELETE /api/courses).
export default function CourseFormSheet({ course, onClose, onChanged }) {
  const isEdit = Boolean(course?.id)
  const [form, setForm] = useState(() => (isEdit
    ? { code: course.code, title: course.title, credits: String(course.credits), term: course.term,
        instructor: course.instructor, capacity: String(course.capacity) }
    : { code: '', title: '', credits: '3', term: '2024/2025', instructor: '', capacity: '30' }))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key) => (value) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setSubmitError(null)
  }

  async function run(action, message) {
    setBusy(true)
    setSubmitError(null)
    try {
      await action()
      onChanged?.(message)
      onClose()
    } catch (failure) {
      if (failure.status !== 401) setSubmitError(failure.message || 'The course could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function save() {
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) return
    const input = {
      code: form.code.trim(), title: form.title.trim(), credits: Number(form.credits),
      term: form.term.trim(), instructor: form.instructor.trim(), capacity: Number(form.capacity),
    }
    run(
      () => (isEdit ? api.updateCourse(course.id, input) : api.createCourse(input)),
      `${input.code} ${isEdit ? 'updated' : 'added to the catalog'}.`,
    )
  }

  const input = (key, props = {}) => (
    <TextInput value={form[key]} onChangeText={set(key)} style={sheetInput} placeholderTextColor={colors.mutedLight} {...props} />
  )

  return (
    <BottomSheet
      visible
      onClose={onClose}
      busy={busy}
      icon={isEdit ? 'create-outline' : 'add-circle-outline'}
      title={isEdit ? 'Edit Course' : 'Add Course'}
      subtitle={isEdit ? `${course.enrolled} approved of ${course.capacity} seats` : 'A new offering appears in the catalog right away.'}
      footer={confirmDelete ? (
        <>
          <PrimaryButton title={busy ? 'Deleting…' : 'Yes, delete course'} busy={busy} variant="danger"
            onPress={() => run(() => api.deleteCourse(course.id), `${course.code} deleted.`)} />
          <PrimaryButton title="Keep course" variant="outline" onPress={() => setConfirmDelete(false)} disabled={busy} />
        </>
      ) : (
        <>
          <PrimaryButton title={busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add course'} variant="gradient" busy={busy} onPress={save} />
          {isEdit ? (
            <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteLink} accessibilityRole="button">
              <Text style={styles.deleteText}>Delete course</Text>
            </Pressable>
          ) : null}
        </>
      )}
    >
      <View style={styles.row}>
        <View style={styles.col}>
          <SheetField label="Course code" error={errors.code}>{input('code', { placeholder: 'CS320', autoCapitalize: 'characters', maxLength: 30 })}</SheetField>
        </View>
        <View style={styles.col}>
          <SheetField label="Term" error={errors.term}>{input('term', { placeholder: '2024/2025', maxLength: 40 })}</SheetField>
        </View>
      </View>
      <SheetField label="Title" error={errors.title}>{input('title', { placeholder: 'Mobile Application Development', maxLength: 200 })}</SheetField>
      <SheetField label="Instructor" error={errors.instructor}>{input('instructor', { placeholder: 'Dr. Rina Marlina', maxLength: 200 })}</SheetField>
      <View style={styles.row}>
        <View style={styles.col}>
          <SheetField label="Credits (SKS)" error={errors.credits}>{input('credits', { keyboardType: 'number-pad', maxLength: 2 })}</SheetField>
        </View>
        <View style={styles.col}>
          <SheetField label="Capacity" error={errors.capacity}>{input('capacity', { keyboardType: 'number-pad', maxLength: 4 })}</SheetField>
        </View>
      </View>
      {isEdit ? (
        <Text style={styles.note}>Code and term cannot change once a student has enrolled. Capacity cannot go below the approved count.</Text>
      ) : null}
      {confirmDelete ? (
        <SheetMessage tone="warning">Delete {course.code}? This only works while no student has an enrollment for it.</SheetMessage>
      ) : null}
      {submitError ? <SheetMessage>{submitError}</SheetMessage> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
  note: { fontSize: 12, color: colors.muted },
  deleteLink: { minHeight: minTap - 8, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: font.body, fontWeight: '700', color: colors.danger },
})
