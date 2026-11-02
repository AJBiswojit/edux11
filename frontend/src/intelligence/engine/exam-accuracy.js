/**
 * EduX exam accuracy — multi-factor score for JEE/NEET-style papers.
 *
 * Official marks/percentage stay whatever the backend scored. This module
 * only computes the accuracy percentage. Marking, difficulty weights,
 * expected times, and mix weights come from examConfig (derived from the
 * exam/questions). Nothing exam-family-specific is hardcoded in the formula.
 */

const DEFAULT_EXAM_ACCURACY_CONFIG = {
  marking: { correct: 1, negative: 0 },
  weights: { answer: 0.50, difficulty: 0.20, time: 0.15, coverage: 0.15 },
  difficulty: { easy: 1.0, medium: 1.5, hard: 2.0 },
  expectedTime: { easy: 60, medium: 90, hard: 150 },
}

const DIFFICULTY_ALIASES = {
  easy: 'easy', e: 'easy',
  medium: 'medium', med: 'medium', moderate: 'medium',
  hard: 'hard', h: 'hard', difficult: 'hard',
}

const EMPTY_RESULT = {
  accuracy: 0,
  answerPerformance: 0,
  difficultyPerformance: 0,
  timeEfficiency: 0,
  questionCoverage: 0,
  netScore: 0,
}

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, low, high) {
  if (!Number.isFinite(value)) return low
  return Math.min(high, Math.max(low, value))
}

function clamp01(value) {
  return clamp(value, 0, 1)
}

function pick(source, keys, fallback = null) {
  if (!source || typeof source !== 'object') return fallback
  for (const key of keys) {
    if (source[key] != null) return source[key]
  }
  return fallback
}

function difficultyKey(raw, fallback = 'medium') {
  if (raw == null || String(raw).trim() === '') return fallback
  const token = String(raw).trim().toLowerCase()
  if (DEFAULT_EXAM_ACCURACY_CONFIG.difficulty[token] != null) return token
  return DIFFICULTY_ALIASES[token] ?? fallback
}

export function mergeExamAccuracyConfig(...overrides) {
  const merged = {
    marking: { ...DEFAULT_EXAM_ACCURACY_CONFIG.marking },
    weights: { ...DEFAULT_EXAM_ACCURACY_CONFIG.weights },
    difficulty: { ...DEFAULT_EXAM_ACCURACY_CONFIG.difficulty },
    expectedTime: { ...DEFAULT_EXAM_ACCURACY_CONFIG.expectedTime },
  }
  for (const blob of overrides) {
    if (!blob || typeof blob !== 'object') continue
    const sections = {
      marking: blob.marking && typeof blob.marking === 'object' ? blob.marking : blob.markingScheme,
      weights: blob.weights,
      difficulty: blob.difficulty && typeof blob.difficulty === 'object' ? blob.difficulty : blob.difficultyWeights,
      expectedTime: blob.expectedTime ?? blob.expected_time,
    }
    for (const [section, extra] of Object.entries(sections)) {
      if (!extra || typeof extra !== 'object') continue
      for (const [rawKey, rawValue] of Object.entries(extra)) {
        if (rawValue == null) continue
        let key = String(rawKey).trim()
        if (section === 'difficulty' || section === 'expectedTime') {
          key = difficultyKey(key, String(rawKey).trim().toLowerCase())
        } else if (section === 'marking' && ['negativeMarks', 'negative_marks', 'wrong'].includes(key)) {
          key = 'negative'
        } else if (section === 'marking' && ['correctMarks', 'correct_marks', 'p'].includes(key)) {
          key = 'correct'
        }
        const number = finite(rawValue, Number.NaN)
        if (!Number.isFinite(number)) continue
        merged[section][key] = number
      }
    }
  }
  return merged
}

export function examAccuracyConfigFromExam(exam = {}) {
  const marking = {}
  const correct = exam.marksPerQuestion ?? exam.marking?.correct
  const negative = exam.negativeMarksPerQuestion ?? exam.marking?.negative
  if (correct != null) marking.correct = correct
  if (negative != null) marking.negative = negative
  return mergeExamAccuracyConfig({
    marking,
    weights: exam.accuracyWeights ?? exam.weights,
    difficulty: exam.difficultyWeights,
    expectedTime: exam.expectedTime,
  })
}

export function questionsFromExamAttempt({ questions = [], interactions = {}, exam = {} } = {}) {
  return questions.map((qq) => {
    const interaction = interactions[qq.id] ?? interactions[qq.questionId] ?? {}
    const selected = pick(interaction, ['selected', 'value', 'selectedAnswer'], null)
    const attempted = selected != null && selected !== ''
    const correctAnswer = qq.correctAnswer ?? qq.correctValue
    const rawType = String(qq.questionType ?? qq.qType ?? qq.q_type ?? qq.type ?? '').toLowerCase().replace(/[-\s]/g, '_')
    const isFib = rawType === 'fill_in_the_blank' || rawType === 'fill_in_blank' || rawType === 'fib' || rawType === 'numerical' || rawType === 'numeric' || rawType === 'integer' || rawType.includes('fill_in')
    return {
      difficulty: qq.difficulty,
      expectedTimeSeconds: qq.expectedTimeSeconds ?? qq.expectedTime,
      actualTimeSeconds: pick(interaction, ['timeSpent', 'seconds', 'elapsedSeconds', 'time'], null),
      isCorrect: attempted ? selected === correctAnswer : null,
      attempted,
      marks: qq.marks ?? exam.marksPerQuestion,
      negativeMarks: isFib ? 0 : (qq.negativeMarks ?? exam.negativeMarksPerQuestion),
    }
  })
}

export function questionsFromResultRows(rows = []) {
  return rows.map((row) => {
    const result = row.result
    const isCorrect = result === 'Correct' || row.isCorrect === true
      ? true
      : result === 'Incorrect' || row.isCorrect === false
        ? false
        : (row.isCorrect ?? null)
    return {
      difficulty: row.difficulty,
      expectedTimeSeconds: row.expectedTimeSeconds ?? row.expectedTime,
      actualTimeSeconds: row.timeSpent ?? row.actualTimeSeconds,
      isCorrect,
      attempted: result === 'Correct' || result === 'Incorrect' || row.attempted === true,
      marks: row.marks,
      negativeMarks: row.negativeMarks,
      marksAwarded: row.marksAwarded,
    }
  })
}

function isAttempted(item) {
  if (item?.attempted === true) return true
  if (item?.attempted === false) return false
  return item?.isCorrect === true || item?.isCorrect === false
}

function expectedTimeFor(item, config) {
  const explicit = pick(item, ['expectedTimeSeconds', 'expectedTime', 'expected_time'], null)
  if (explicit != null && explicit !== '') {
    const seconds = finite(explicit, Number.NaN)
    if (Number.isFinite(seconds) && seconds > 0) return seconds
  }
  const key = difficultyKey(item?.difficulty)
  return finite(config.expectedTime[key], config.expectedTime.medium)
}

export function calculateExamAccuracy({
  questions,
  correctAnswers,
  wrongAnswers,
  attemptedQuestions,
  totalQuestions,
  totalTimeSeconds,
  markingScheme,
  weights,
  examConfig,
} = {}) {
  const config = mergeExamAccuracyConfig(
    examConfig,
    (markingScheme || weights) ? { marking: markingScheme, weights } : null,
  )
  const rows = Array.isArray(questions) ? questions.filter((row) => row && typeof row === 'object') : []

  let correct
  let wrong
  let attempted
  let totalQ

  if (rows.length) {
    totalQ = rows.length
    correct = rows.filter((row) => row.isCorrect === true).length
    wrong = rows.filter((row) => row.isCorrect === false).length
    attempted = rows.filter(isAttempted).length
  } else {
    correct = Math.max(0, Number.parseInt(correctAnswers, 10) || 0)
    wrong = Math.max(0, Number.parseInt(wrongAnswers, 10) || 0)
    attempted = attemptedQuestions != null
      ? Math.max(0, Number.parseInt(attemptedQuestions, 10) || 0)
      : correct + wrong
    totalQ = totalQuestions != null
      ? Math.max(0, Number.parseInt(totalQuestions, 10) || 0)
      : attempted
  }

  if (totalQ <= 0) return { ...EMPTY_RESULT }

  const correctMarks = Math.abs(finite(config.marking.correct, 1))
  const negativeMarks = Math.abs(finite(config.marking.negative, 0))

  let netScore
  let maxScore
  let weightedCorrect
  let totalDifficulty
  let expectedTime
  let actualTime
  let timedAttempted

  if (rows.length) {
    netScore = 0
    maxScore = 0
    weightedCorrect = 0
    totalDifficulty = 0
    expectedTime = 0
    actualTime = 0
    timedAttempted = 0
    for (const row of rows) {
      let marks = finite(pick(row, ['marks', 'maxMarks', 'max_marks'], correctMarks), correctMarks)
      if (marks < 0) marks = correctMarks
      maxScore += marks
      const weight = finite(config.difficulty[difficultyKey(pick(row, ['difficulty'], null))], config.difficulty.medium)
      totalDifficulty += weight
      const awarded = pick(row, ['marksAwarded', 'marks_awarded'], null)
      if (awarded != null) {
        netScore += finite(awarded)
      } else if (row.isCorrect === true) {
        netScore += marks
        weightedCorrect += weight
      } else if (row.isCorrect === false) {
        const neg = pick(row, ['negativeMarks', 'negative_marks'], negativeMarks)
        netScore -= Math.abs(finite(neg, negativeMarks))
      }
      if (row.isCorrect === true && awarded != null) weightedCorrect += weight
      if (isAttempted(row)) {
        expectedTime += expectedTimeFor(row, config)
        const spent = pick(row, ['actualTimeSeconds', 'timeSpent', 'seconds'], null)
        if (spent != null && spent !== '') {
          actualTime += Math.max(0, finite(spent))
          timedAttempted += 1
        }
      }
    }
    if (totalTimeSeconds != null && totalTimeSeconds !== '' && timedAttempted === 0) {
      actualTime = Math.max(0, finite(totalTimeSeconds))
      timedAttempted = attempted
    }
  } else {
    netScore = (correct * correctMarks) - (wrong * negativeMarks)
    maxScore = totalQ * correctMarks
    const mediumWeight = finite(config.difficulty.medium, 1.5)
    totalDifficulty = totalQ * mediumWeight
    weightedCorrect = correct * mediumWeight
    expectedTime = attempted * finite(config.expectedTime.medium, 90)
    actualTime = totalTimeSeconds != null && totalTimeSeconds !== '' ? Math.max(0, finite(totalTimeSeconds)) : 0
    timedAttempted = totalTimeSeconds != null && totalTimeSeconds !== '' ? attempted : 0
  }

  const answerPerformance = maxScore > 0 ? clamp01(netScore / maxScore) : 0
  const difficultyPerformance = totalDifficulty > 0 ? clamp01(weightedCorrect / totalDifficulty) : 0
  const questionCoverage = totalQ > 0 ? clamp01(attempted / totalQ) : 0

  let timeEfficiency
  if (attempted <= 0) timeEfficiency = 0
  else if (actualTime <= 0 || !Number.isFinite(actualTime)) timeEfficiency = expectedTime > 0 ? 1 : 0
  else timeEfficiency = clamp01(expectedTime / actualTime)

  const mix = config.weights
  const composite =
    finite(mix.answer) * answerPerformance
    + finite(mix.difficulty) * difficultyPerformance
    + finite(mix.time) * timeEfficiency
    + finite(mix.coverage) * questionCoverage

  return {
    accuracy: Math.round(clamp(composite * 100, 0, 100) * 100) / 100,
    answerPerformance: Math.round(answerPerformance * 10000) / 10000,
    difficultyPerformance: Math.round(difficultyPerformance * 10000) / 10000,
    timeEfficiency: Math.round(timeEfficiency * 10000) / 10000,
    questionCoverage: Math.round(questionCoverage * 10000) / 10000,
    netScore: Math.round(netScore * 100) / 100,
  }
}

export { DEFAULT_EXAM_ACCURACY_CONFIG }
