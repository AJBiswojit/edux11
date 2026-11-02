/**
 * Faculty Intelligence — Question Studio question pools (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded per-subject
 * question pools (a large generative question bank) were an authoritative
 * frontend question database — they are physically REMOVED. Question
 * generation now runs over the source/settings supplied by the service layer
 * (backend) instead of a hardcoded frontend pool.
 *
 * `buildStudioPools(rows)` is preserved as pure deterministic logic (the
 * pool-building algorithm). `questionStudioPools` / `allStudioQuestions` are
 * kept empty so the engine's module imports still resolve.
 */

/** Build a question pool object from raw rows (pure deterministic logic). */
export function buildStudioPools({ sourceId, domain, exam, subject, chapter, rows }) {
  return (rows ?? []).map((row, index) => ({
    id: `${sourceId}-q${String(index + 1).padStart(2, '0')}`,
    sourceId,
    domain,
    exam,
    subject,
    chapter,
    topic: row.topic ?? '',
    qType: row.qType ?? row.questionPattern ?? 'Direct MCQ',
    difficulty: row.difficulty ?? 'Medium',
    question: row.question ?? '',
    options: row.options ?? [],
    correctAnswer: row.correctAnswer ?? null,
    answerIndex: row.answerIndex ?? null,
    concept: row.concept ?? '',
    explanation: row.explanation ?? '',
    generationMetadata: row.generationMetadata ?? null,
  }))
}

export const questionStudioPools = {}
export const allStudioQuestions = []

export default { questionStudioPools, allStudioQuestions }
