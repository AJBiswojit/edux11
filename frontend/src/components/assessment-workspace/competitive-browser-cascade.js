/**
 * Competitive Question Browser (Assessment Workspace) — feature-declared
 * filter cascade.
 *
 * Exam → Subject → Chapter → Topic, all derived from the actual question
 * set (JEE + NEET records). Year / Difficulty / Type / search are
 * INDEPENDENT keys — they are not part of the graph and never cascade.
 *
 * "All" is both the cleared sentinel and the "no filter" value, so it is
 * also the per-key empty value for the shared engine.
 */

export const COMPETITIVE_BROWSER_DEPENDENCIES = {
  exam: [],
  subject: ['exam'],
  chapter: ['exam', 'subject'],
  topic: ['exam', 'subject', 'chapter'],
}

export const COMPETITIVE_BROWSER_EMPTY = { exam: 'All', subject: 'All', chapter: 'All', topic: 'All' }

export function browserExamList(questions = [], exams = []) {
  return exams.length ? exams : [...new Set(questions.map((q) => q.exam))]
}

/**
 * @param {Object} ctx
 * @param {Array} ctx.questions
 * @param {Array} ctx.exams    explicit exam list (fallback: distinct q.exam)
 */
export function buildCompetitiveBrowserCascade({ questions = [], exams = [] }) {
  const examList = browserExamList(questions, exams)
  const effective = (value) => (value === 'All' && examList.length === 1 ? examList[0] : value)
  const byExam = (values) => questions.filter((q) => effective(values.exam) === 'All' || q.exam === effective(values.exam))
  const bySubject = (values) => byExam(values).filter((q) => values.subject === 'All' || q.subject === values.subject)

  return {
    dependencies: COMPETITIVE_BROWSER_DEPENDENCIES,
    emptyValues: COMPETITIVE_BROWSER_EMPTY,
    /* Strict: an empty chapter/topic list means the parent selection no
       longer supports the child — clear it. Initial state is all "All"
       sentinels, so a still-loading question set cannot wipe values. */
    treatEmptyOptionsAsInvalid: true,
    deriveOptions: (key, values) => {
      switch (key) {
        case 'exam':
          return examList
        case 'subject':
          return [...new Set(byExam(values).map((q) => q.subject))]
        case 'chapter':
          return [...new Set(bySubject(values).map((q) => q.chapter))]
        case 'topic':
          return [
            ...new Set(
              bySubject(values)
                .filter((q) => values.chapter === 'All' || q.chapter === values.chapter)
                .map((q) => q.topic),
            ),
          ]
        default:
          return []
      }
    },
  }
}

export default buildCompetitiveBrowserCascade
