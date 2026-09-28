const GRADE_SCALE = [
    { min: 85, letter: 'A',  points: 4.0 },
    { min: 80, letter: 'A-', points: 3.7 },
    { min: 75, letter: 'B+', points: 3.3 },
    { min: 70, letter: 'B',  points: 3.0 },
    { min: 65, letter: 'B-', points: 2.7 },
    { min: 60, letter: 'C+', points: 2.3 },
    { min: 55, letter: 'C',  points: 2.0 },
    { min: 50, letter: 'C-', points: 1.7 },
    { min: 40, letter: 'D',  points: 1.0 },
  ]
  
  export function toLetterGrade(score) {
    const band = GRADE_SCALE.find((item) => score >= item.min)
    return band ? { letter: band.letter, points: band.points } : { letter: 'F', points: 0.0 }
  }
  
  export function computeGpa(gradeList) {
    const totalCredits = gradeList.reduce((sum, g) => sum + g.credits, 0)
    if (totalCredits === 0) return 0
    const totalPoints = gradeList.reduce((sum, g) => sum + g.points * g.credits, 0)
    return totalPoints / totalCredits
  }