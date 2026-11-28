// Terms are free text ("2024/2025", "Semester Ganjil 2025/2026"), so they are ordered by the
// highest year they mention, then alphabetically. Same helper as mobile-app/src/lib/terms.js.
function latestYear(term) {
  const years = String(term).match(/\d{4}/g)
  return years ? Math.max(...years.map(Number)) : 0
}

// Unique terms of the given courses, newest first.
export function termsFromCourses(courses = []) {
  const terms = [...new Set(courses.map((course) => course.term).filter(Boolean))]
  return terms.sort((a, b) => latestYear(b) - latestYear(a) || b.localeCompare(a))
}

// The newest term in the catalog, or '' when there are no courses yet.
export function newestTerm(courses = []) {
  return termsFromCourses(courses)[0] ?? ''
}
