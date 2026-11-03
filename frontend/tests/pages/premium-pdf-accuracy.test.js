import { describe, expect, it } from 'vitest'
import { calculateOverallAccuracy, scorePercentage } from '../../src/pages/student/premium-pdf/accuracy.js'

describe('overall accuracy from question results', () => {
  it('uses correct divided by correct plus incorrect, excluding skipped questions', () => {
    const result = calculateOverallAccuracy({ correct: 55, incorrect: 11, skipped: 9 })
    expect(result).toMatchObject({ correct: 55, incorrect: 11, skipped: 9, attempted: 66, accuracy: 83.33 })
  })

  it('deduplicates detailed results by question identity and excludes skips', () => {
    const result = calculateOverallAccuracy({
      totalQuestions: 4,
      questionReview: [
        { questionId: 'q1', status: 'Correct' },
        { questionId: 'q1', status: 'Correct' },
        { questionId: 'q2', status: 'Incorrect' },
        { questionId: 'q3', status: 'Skipped', isCorrect: false },
        { questionId: 'q4', status: 'Correct' },
      ],
    })
    expect(result).toMatchObject({ correct: 2, incorrect: 1, skipped: 1, attempted: 3, accuracy: 66.67, source: 'question-results' })
  })

  it('prefers published aggregates when the detailed review list is partial', () => {
    const result = calculateOverallAccuracy({
      questionIntelligence: { total: 75, correct: 47, incorrect: 14, skipped: 7 },
      questionReview: Array.from({ length: 14 }, (_, index) => ({
        q: `Q${index + 1}`, status: index < 10 ? 'Correct' : 'Incorrect',
      })),
    })
    expect(result).toMatchObject({ correct: 47, incorrect: 14, skipped: 7, attempted: 61, accuracy: 77.05, source: 'aggregate-counts' })
  })

  it('returns unavailable for zero attempts, missing results, or unsafe counts', () => {
    expect(calculateOverallAccuracy({ correct: 0, incorrect: 0, skipped: 9 }).accuracy).toBeNull()
    expect(calculateOverallAccuracy({}).accuracy).toBeNull()
    expect(calculateOverallAccuracy({ correct: 'NaN', incorrect: 4 }).accuracy).toBeNull()
  })

  it('keeps score percentage separate from overall accuracy', () => {
    expect(scorePercentage(182, 300, 60.7)).toBe(60.67)
    expect(scorePercentage(null, 300, null)).toBeNull()
  })
})
