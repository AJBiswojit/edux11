/**
 * Shared attempt factories — consolidates the duplicated attempt builders
 * that were previously inline in 3+ test files.
 *
 * The factory mirrors the canonical ExamAttempt contract used by
 * computeStudent360 and related intelligence engines.
 */

export function makeQuestionAttempts({ id, subject, chapter, topic, outcomes }) {
  return outcomes.map((o, index) => ({
    questionId: `${id}-q${index + 1}`,
    academicContext: { subject, chapter, topic: topic ?? chapter },
    question: {
      difficulty: o.diff ?? 'Medium',
      marks: 4,
      type: 'MCQ',
      correctAnswer: 0,
      text: `${chapter} q${index + 1}`,
    },
    response: {
      selectedAnswer: o.skipped ? null : o.correct ? 0 : 1,
      status: o.skipped ? 'skipped' : 'answered',
      answerChanges: o.changes ?? 0,
      markedForReview: !!o.marked,
    },
    timing: { timeSpent: o.time ?? 60 },
    behaviour: { visits: o.visits ?? 1 },
    evaluation: {
      isCorrect: !!o.correct,
      isSkipped: !!o.skipped,
      classification:
        o.classification ??
        (o.skipped ? null : o.correct ? (o.time <= 30 ? 'fast-correct' : 'slow-correct') : o.time <= 30 ? 'fast-incorrect' : 'slow-incorrect'),
    },
  }))
}

export function makeAttempt({
  id,
  student,
  examMode,
  examFamily = null,
  subject,
  chapter,
  topic = chapter,
  outcomes,
  submittedAt,
}) {
  const studentId = typeof student === 'string' ? student : student?.id ?? 'fixture-student'
  const roll = typeof student === 'object' ? student.roll : student ? undefined : 'FIX-001'
  return {
    id,
    studentId,
    roll,
    mode: 'manual',
    examMode,
    examFamily,
    examType: examFamily,
    category: examMode,
    examId: id,
    examName: id,
    submittedAt:
      submittedAt ?? `2026-08-${String(Number(id.slice(-2)) || 1).padStart(2, '0')}T10:00:00.000Z`,
    scoring: { pct: 50, accuracy: 50, attemptRate: 100 },
    questionAttempts: makeQuestionAttempts({ id, subject, chapter, topic, outcomes }),
  }
}

export function universityAttempt({ id, student, subject = 'CS501', chapter = 'Graph Algorithms', outcomes, ...rest }) {
  return makeAttempt({
    id,
    student,
    examMode: 'University',
    examFamily: null,
    subject,
    chapter,
    outcomes,
    ...rest,
  })
}

export function jeeAttempt({ id, student, subject, chapter, outcomes, ...rest }) {
  return makeAttempt({
    id,
    student,
    examMode: 'Competitive',
    examFamily: 'JEE',
    subject,
    chapter,
    outcomes,
    ...rest,
  })
}

export function neetAttempt({ id, student, subject, chapter, outcomes, ...rest }) {
  return makeAttempt({
    id,
    student,
    examMode: 'Competitive',
    examFamily: 'NEET',
    subject,
    chapter,
    outcomes,
    ...rest,
  })
}

export function canonicalExamAttempt({
  id = 'exam-after-1',
  studentId = 'student-a',
  interventionId = null,
  domain = 'Competitive',
  examFamily = 'JEE',
  subject = 'Physics',
  chapter = 'Rotational Motion',
  submittedAt = '2026-09-01T10:00:00.000Z',
  correct = 3,
  incorrect = 1,
  skipped = 1,
}) {
  const rows = []
  for (let i = 0; i < correct + incorrect + skipped; i += 1) {
    const isSkipped = i >= correct + incorrect
    const isCorrect = i < correct
    rows.push({
      questionId: `${id}-q${i + 1}`,
      academicContext: { subject, chapter, topic: chapter },
      question: { type: 'MCQ', marks: 4, correctAnswer: 0, text: `${chapter} ${i + 1}` },
      response: { selectedAnswer: isSkipped ? null : isCorrect ? 0 : 1, status: isSkipped ? 'skipped' : 'answered' },
      timing: { timeSpent: isSkipped ? 0 : 60 + i },
      evaluation: { isCorrect, isSkipped },
    })
  }
  return {
    id,
    studentId,
    interventionId,
    source: 'exam-agent',
    mode: 'manual',
    examId: `exam-${examFamily ?? 'uni'}`,
    examName: 'Exam Agent Practice',
    examMode: domain,
    examFamily: domain === 'University' ? null : examFamily,
    submittedAt,
    completedAt: submittedAt,
    scoring: { score: correct * 4 - incorrect, maxScore: rows.length * 4 },
    questionAttempts: rows,
  }
}
