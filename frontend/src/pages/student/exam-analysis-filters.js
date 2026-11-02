/**
 * AI Exam Analysis (Student) — feature-declared filter cascade.
 *
 * Dependency reality (from the canonical exam-options dataset):
 *   - Exam context (University / Competitive) and exam family (JEE / NEET)
 *     are context switches (chips in the UI, but part of the cascade state
 *     so downstream selectors can never leak across them).
 *   - Exam options are DERIVED from context + family — University and
 *     Competitive lists never mix (domain isolation: a JEE Physics exam is
 *     never offered under University, and NEET Physics ≠ JEE Physics).
 *   - Subjects are derived from the selected exam's own subject list.
 *
 * Family detection reads the exam's canonical metadata (pattern/name),
 * never the subject name.
 */

export const EXAM_ANALYSIS_DEPENDENCIES = {
  family: ['context'],
  examId: ['context', 'family'],
  subject: ['context', 'family', 'examId'],
}

/** Exam family from canonical exam metadata — never from subject names. */
export function examFamilyOf(option = {}) {
  const meta = `${option.pattern ?? ''} ${option.shortName ?? ''} ${option.name ?? ''}`
  if (/NEET/i.test(meta)) return 'NEET'
  if (/JEE/i.test(meta)) return 'JEE'
  return /Biology/i.test(meta) ? 'NEET' : 'JEE'
}

/** Families present in the competitive options of the dataset. */
export function competitiveExamFamilies(options = []) {
  return [...new Set(options.filter((o) => o.category !== 'University').map(examFamilyOf))]
}

/** Context isolation: the options a selector may ever show. */
export function visibleExamOptions(options = [], context, family) {
  if (context === 'University') return options.filter((o) => o.category === 'University')
  return options.filter((o) => o.category !== 'University' && (family === 'All' || examFamilyOf(o) === family))
}

export function buildExamAnalysisCascade(options = []) {
  const families = competitiveExamFamilies(options)
  return {
    dependencies: EXAM_ANALYSIS_DEPENDENCIES,
    /* 'family' is cleared to 'All' (chips), exam/subject to empty.
       Strict: with no exam selected the subject list is empty, and a stale
       subject must clear when the exam is cleared (the initial state is
       empty, so async loading can never wipe a valid value). */
    treatEmptyOptionsAsInvalid: true,
    emptyValues: { family: 'All', examId: '', subject: '' },
    deriveOptions: (key, values) => {
      if (key === 'family') return values.context === 'Competitive' ? ['All', ...families] : ['All']
      if (key === 'examId') return visibleExamOptions(options, values.context, values.family).map((o) => o.id)
      const exam = (options ?? []).find((o) => o.id === values.examId)
      return exam?.subjects ?? []
    },
  }
}

export default buildExamAnalysisCascade
