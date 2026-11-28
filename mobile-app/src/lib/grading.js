// Preview only: shows the letter while the registrar types a score. The server
// (backend/src/grading.js) computes the official letter and points that are stored and shown.
// Same bands as the API and src/utils/grade.js on the web.
const scale = [
  [85, 'A', 4.0], [80, 'A-', 3.7], [75, 'B+', 3.3], [70, 'B', 3.0],
  [65, 'B-', 2.7], [60, 'C+', 2.3], [55, 'C', 2.0], [50, 'C-', 1.7], [40, 'D', 1.0],
]

export function previewGrade(score) {
  const band = scale.find(([minimum]) => score >= minimum)
  return band ? { letter: band[1], points: band[2] } : { letter: 'F', points: 0 }
}

// Parses the score field: 0–100, comma or dot, at most 2 decimals (the API's rule), else null.
// Same as parseScore in src/utils/grade.js on the web.
export function parseScore(text) {
  const trimmed = String(text ?? '').trim()
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(trimmed)) return null
  const value = Number(trimmed.replace(',', '.'))
  return value >= 0 && value <= 100 ? value : null
}

// GPA text and standing label. gradedCount 0 (or unknown with gpa missing) means "no grades yet";
// a real 0.00 GPA (all F) is shown as 0.00, not hidden.
export function gpaSummary(gpa, gradedCount) {
  const hasGrades = gradedCount != null ? gradedCount > 0 : gpa != null && Number(gpa) > 0
  if (!hasGrades || gpa == null) return { text: '—', standing: 'No grades recorded yet', hasGrades: false }
  const value = Number(gpa)
  const standing = value >= 3.5 ? 'Excellent Standing (GPA 3.50+)'
    : value >= 3.0 ? 'Good Academic Standing'
      : value >= 2.0 ? 'Satisfactory Standing' : 'Below 2.00 · talk to your academic advisor'
  return { text: value.toFixed(2), standing, hasGrades: true }
}
