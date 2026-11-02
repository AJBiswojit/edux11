/**
 * Student Intelligence — competitive exam datasets (DATA ONLY).
 * PYQ performance per exam family (JEE · NEET), deterministic and aligned
 * with the Faculty PYQ competitive corpus chapter names
 * (src/intelligence/faculty/datasets/assessment.js) so the two modules
 * never contradict each other.
 *
 * JEE family subjects: Physics · Chemistry · Mathematics
 * NEET family subjects: Physics · Chemistry · Biology
 * The competitive ENGINE derives accuracy, speed, negative-marking
 * discipline and chapter mastery from these base observations.
 */

/* ------------------------------------------------------------------ */
/* Competitive PYQ performance (previous-year question practice)       */
/* ------------------------------------------------------------------ */
export const competitivePyqPerformance = {
  JEE: {
    family: 'JEE',
    totalAttempted: 630,
    totalCorrect: 386,
    accuracy: 61.3, // derived-friendly base: correct / attempted
    avgSecondsPerQuestion: 96,
    guessRate: 8, // % of attempts that were confident guesses (drives negative-marking discipline)
    subjects: [
      {
        code: 'PHY', name: 'Physics', attempted: 240, correct: 148, accuracy: 61.7, avgSeconds: 95,
        chapters: [
          { chapter: 'Mechanics', accuracy: 52, attempted: 58 },
          { chapter: 'Thermodynamics', accuracy: 64, attempted: 36 },
          { chapter: 'Current Electricity', accuracy: 68, attempted: 34 },
          { chapter: 'Electrostatics', accuracy: 66, attempted: 38 },
          { chapter: 'Optics', accuracy: 58, attempted: 44 },
          { chapter: 'Modern Physics', accuracy: 71, attempted: 30 },
        ],
      },
      {
        code: 'CHE', name: 'Chemistry', attempted: 180, correct: 119, accuracy: 66.1, avgSeconds: 58,
        chapters: [
          { chapter: 'Physical Chemistry', accuracy: 62, attempted: 62 },
          { chapter: 'Organic Chemistry', accuracy: 70, attempted: 66 },
          { chapter: 'Inorganic Chemistry', accuracy: 58, attempted: 52 },
        ],
      },
      {
        code: 'MAT', name: 'Mathematics', attempted: 210, correct: 119, accuracy: 56.7, avgSeconds: 112,
        chapters: [
          { chapter: 'Calculus', accuracy: 58, attempted: 64 },
          { chapter: 'Coordinate Geometry', accuracy: 62, attempted: 42 },
          { chapter: 'Algebra', accuracy: 66, attempted: 44 },
          { chapter: 'Probability', accuracy: 60, attempted: 26 },
          { chapter: 'Vectors & 3D', accuracy: 52, attempted: 34 },
        ],
      },
    ],
  },
  NEET: {
    family: 'NEET',
    totalAttempted: 300,
    totalCorrect: 216,
    accuracy: 72.0,
    avgSecondsPerQuestion: 52,
    guessRate: 5,
    subjects: [
      {
        code: 'PHY', name: 'Physics', attempted: 90, correct: 63, accuracy: 70.0, avgSeconds: 85,
        chapters: [
          { chapter: 'Mechanics', accuracy: 68, attempted: 24 },
          { chapter: 'Thermodynamics', accuracy: 72, attempted: 14 },
          { chapter: 'Current Electricity', accuracy: 71, attempted: 14 },
          { chapter: 'Electrostatics', accuracy: 69, attempted: 14 },
          { chapter: 'Optics', accuracy: 70, attempted: 14 },
          { chapter: 'Modern Physics', accuracy: 73, attempted: 10 },
        ],
      },
      {
        code: 'CHE', name: 'Chemistry', attempted: 90, correct: 65, accuracy: 72.2, avgSeconds: 50,
        chapters: [
          { chapter: 'Physical Chemistry', accuracy: 71, attempted: 30 },
          { chapter: 'Organic Chemistry', accuracy: 74, attempted: 32 },
          { chapter: 'Inorganic Chemistry', accuracy: 68, attempted: 28 },
        ],
      },
      {
        code: 'BIO', name: 'Biology', attempted: 120, correct: 88, accuracy: 73.3, avgSeconds: 40,
        chapters: [
          { chapter: 'Human Physiology', accuracy: 76, attempted: 28 },
          { chapter: 'Genetics & Evolution', accuracy: 71, attempted: 24 },
          { chapter: 'Cell Biology', accuracy: 74, attempted: 22 },
          { chapter: 'Plant Physiology', accuracy: 70, attempted: 20 },
          { chapter: 'Ecology', accuracy: 77, attempted: 14 },
          { chapter: 'Biomolecules', accuracy: 72, attempted: 12 },
        ],
      },
    ],
  },
}

export default { competitivePyqPerformance }
