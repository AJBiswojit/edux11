import { describe, expect, it } from 'vitest'
import { calculateExamAccuracy, DEFAULT_EXAM_ACCURACY_CONFIG } from '../../src/intelligence/engine/exam-accuracy.js'

const JEE_MARKING = { correct: 4, negative: 1 }

describe('calculateExamAccuracy', () => {
  it('does not hardcode JEE/NEET marking in the engine defaults', () => {
    expect(DEFAULT_EXAM_ACCURACY_CONFIG.marking.correct).toBe(1)
    expect(DEFAULT_EXAM_ACCURACY_CONFIG.marking.negative).toBe(0)
  })

  it('Case A — low attempt is not 100%', () => {
    const result = calculateExamAccuracy({
      correctAnswers: 3,
      wrongAnswers: 0,
      attemptedQuestions: 3,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    })
    expect(result.accuracy).not.toBe(100)
    expect(result.questionCoverage).toBe(0.03)
    expect(result.accuracy).toBe(17.55)
  })

  it('Case B — mixed performance components', () => {
    const result = calculateExamAccuracy({
      correctAnswers: 60,
      wrongAnswers: 20,
      attemptedQuestions: 80,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    })
    expect(result.netScore).toBe(220)
    expect(result.answerPerformance).toBe(0.55)
    expect(result.difficultyPerformance).toBe(0.6)
    expect(result.questionCoverage).toBe(0.8)
    expect(result.accuracy).toBe(66.5)
  })

  it('Case C — strong performance', () => {
    const result = calculateExamAccuracy({
      correctAnswers: 75,
      wrongAnswers: 15,
      attemptedQuestions: 90,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    })
    expect(result.netScore).toBe(285)
    expect(result.answerPerformance).toBe(0.7125)
    expect(result.accuracy).toBe(79.13)
  })

  it('Case D — all wrong zeroes answer and difficulty performance', () => {
    const result = calculateExamAccuracy({
      correctAnswers: 0,
      wrongAnswers: 100,
      attemptedQuestions: 100,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    })
    expect(result.answerPerformance).toBe(0)
    expect(result.difficultyPerformance).toBe(0)
    expect(result.accuracy).toBe(30)
  })

  it('Case E — all correct is 100%', () => {
    const result = calculateExamAccuracy({
      correctAnswers: 100,
      wrongAnswers: 0,
      attemptedQuestions: 100,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    })
    expect(result.accuracy).toBe(100)
  })

  it('handles empty, missing, and zero-time inputs without NaN', () => {
    expect(calculateExamAccuracy({ questions: [], totalQuestions: 0 }).accuracy).toBe(0)
    expect(calculateExamAccuracy({
      correctAnswers: 0, wrongAnswers: 0, attemptedQuestions: 0, totalQuestions: 10, markingScheme: JEE_MARKING,
    }).accuracy).toBe(0)
    const missing = calculateExamAccuracy({
      questions: [{ isCorrect: true }, { isCorrect: false, difficulty: null, actualTimeSeconds: null }],
      markingScheme: JEE_MARKING,
    })
    expect(missing.accuracy).toBeGreaterThanOrEqual(0)
    expect(missing.accuracy).toBeLessThanOrEqual(100)
    expect(calculateExamAccuracy({
      questions: [{ isCorrect: true, actualTimeSeconds: 0, difficulty: 'easy' }],
      markingScheme: JEE_MARKING,
    }).timeEfficiency).toBe(1)
  })

  it('accepts custom weights without changing the formula', () => {
    const args = {
      correctAnswers: 60,
      wrongAnswers: 20,
      attemptedQuestions: 80,
      totalQuestions: 100,
      markingScheme: JEE_MARKING,
    }
    const coverageFirst = calculateExamAccuracy({ ...args, weights: { answer: 0, difficulty: 0, time: 0, coverage: 1 } })
    expect(coverageFirst.accuracy).toBe(80)
  })
})
