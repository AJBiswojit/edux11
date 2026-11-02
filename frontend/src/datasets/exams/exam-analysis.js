/**
 * AI Exam Analysis (Student) — formerly held hardcoded exam options and
 * seeded analysis data.
 *
 * All analysis data and exam option lists now come from the backend API:
 *   GET /student/exam-analysis/options   → exam selector dropdown
 *   GET /student/exam-analysis/:id       → full analysis dashboard
 *
 * This file is kept as a neutral shell so any stale import paths resolve
 * without error.  No consumer should import from here.
 */

export const examAnalysis = {}
export const examAnalysisOptions = []
export const examAnalysisVariants = {}
export const universityExamOptions = []
