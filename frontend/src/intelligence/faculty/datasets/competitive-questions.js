/**
 * Faculty Intelligence — competitive question pool (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded JEE / NEET
 * competitive questions and University PYQ question lists were an
 * authoritative frontend question database — they are physically REMOVED.
 * The Question Studio / Question Intelligence surfaces receive questions
 * from the service layer (backend).
 *
 * Export names are preserved so the engine still resolves; every pool is
 * empty (UI consumes loading/empty/neutral state).
 */

export const universityPyqQuestions = []
export const competitiveQuestions = []

export default { competitiveQuestions, universityPyqQuestions }
