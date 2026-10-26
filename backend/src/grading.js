// Matches src/utils/grade.js in the Week 7 frontend. Tested for parity.
const scale = [
  [85, 'A', 4.0], [80, 'A-', 3.7], [75, 'B+', 3.3], [70, 'B', 3.0],
  [65, 'B-', 2.7], [60, 'C+', 2.3], [55, 'C', 2.0], [50, 'C-', 1.7], [40, 'D', 1.0],
]

export function gradeForScore(score) {
  const band = scale.find(([minimum]) => score >= minimum)
  return band ? { letter: band[1], points: band[2] } : { letter: 'F', points: 0 }
}

export function gpaForGrades(grades) {
  const credits = grades.reduce((total, grade) => total + grade.credits, 0)
  return credits ? grades.reduce((total, grade) => total + grade.credits * grade.points, 0) / credits : 0
}
