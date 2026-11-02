/**
 * Question Paper Studio (Assessment Workspace) — feature-declared filter
 * cascade.
 *
 * Dependency reality (backed exclusively by the live faculty paper-generator
 * catalog from PostgreSQL):
 *   - University: Course → Subject → Chapter → Topic.
 *   - Competitive: Subject → Chapter → Topic (Domain + Exam Family are
 *     context chips, not cascade keys).
 *
 * There are no hardcoded course/subject/chapter/topic fallbacks. If the
 * catalog is empty the corresponding options stay empty (the UI keeps the
 * "All …" sentinels only when a real child list exists).
 *
 * Cleared values use the studio's "All …" sentinels.
 */

export const PAPER_GENERATOR_DEPENDENCIES = {
  course: [],
  subject: ['course'],
  chapter: ['subject'],
  topic: ['chapter'],
}

export const PAPER_GENERATOR_EMPTY = {
  subject: 'All subjects',
  chapter: 'All chapters',
  topic: 'All topics',
}

const courseLabel = (course) => (course ? `${course.code} — ${course.name}` : '')

/**
 * Canonical Competitive syllabus subject sets (product configuration).
 *
 * JEE and NEET are national fixed-syllabus examinations: their subject set
 * is defined by the exam itself, not by institution catalog data. The live
 * backend catalog (config.competitiveSubjects, derived from real Subject
 * rows) is authoritative when the institution manages its own competitive
 * subjects; when that list is empty (the institution's subjects table
 * carries only University courses), this canonical syllabus map provides
 * the deterministic JEE/NEET subject set. No fake courses/chapters are
 * invented — chapters still come exclusively from real subject rows.
 */
export const COMPETITIVE_SYLLABUS_SUBJECTS = {
  JEE: ['Mathematics', 'Physics', 'Chemistry'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
}

export function competitiveSubjectsFor(exam, cfg) {
  const family = String(exam ?? 'JEE').trim().toUpperCase() === 'NEET' ? 'NEET' : 'JEE'
  const fromCatalog = Array.isArray(cfg?.competitiveSubjects?.[family])
    ? cfg.competitiveSubjects[family].filter(Boolean)
    : []
  if (fromCatalog.length > 0) return fromCatalog
  return COMPETITIVE_SYLLABUS_SUBJECTS[family] ?? []
}

/**
 * @param {Object} ctx
 * @param {'University'|'Competitive'} ctx.mode
 * @param {'JEE'|'NEET'} [ctx.exam]
 * @param {object|null} ctx.cfg paper-generator config produced by the live
 *   backend catalog (courseCatalog, subjectCatalog, competitiveSubjects).
 */
export function buildPaperGeneratorCascade({ mode, exam = 'JEE', cfg = null }) {
  const competitive = mode === 'Competitive'

  const courseCatalog = cfg?.courseCatalog ?? []
  const subjectCatalog = cfg?.subjectCatalog ?? []
  const courseOptions = courseCatalog.map(courseLabel)
  const courseByLabel = new Map(courseCatalog.map((course) => [courseLabel(course), course]))
  const subjectByName = new Map(subjectCatalog.map((subject) => [subject.name, subject]))

  const subjectOptionsFor = (values) => {
    if (competitive) return competitiveSubjectsFor(exam, cfg)
    const course = courseByLabel.get(values?.course)
    if (!course?.subjectCode) return []
    const subject = subjectCatalog.find(
      (row) => row.code === course.subjectCode || row.name === course.subjectName,
    )
    return subject ? [subject.name] : []
  }

  const chapterOptionsFor = (values) => {
    const subject = subjectByName.get(values?.subject)
    if (!subject) return []
    return (subject.chapters ?? []).map((chapter) => chapter.name)
  }

  const topicOptionsFor = (values) => {
    const subject = subjectByName.get(values?.subject)
    if (!subject) return []
    const chapter = (subject.chapters ?? []).find((row) => row.name === values?.chapter)
    return chapter?.topics ?? []
  }

  const dependencies = competitive
    ? { subject: [], chapter: ['subject'], topic: ['chapter'] }
    : { course: [], subject: ['course'], chapter: ['subject'], topic: ['chapter'] }

  return {
    dependencies,
    emptyValues: { subject: PAPER_GENERATOR_EMPTY.subject, chapter: PAPER_GENERATOR_EMPTY.chapter, topic: PAPER_GENERATOR_EMPTY.topic },
    /* A parent that has no real children (or a freshly changed parent) must
       never leave a stale child selected. */
    treatEmptyOptionsAsInvalid: true,
    deriveOptions: (key, values) => {
      if (!cfg) return []
      switch (key) {
        case 'course':
          return courseOptions
        case 'subject':
          return subjectOptionsFor(values)
        case 'chapter':
          return chapterOptionsFor(values)
        case 'topic':
          return topicOptionsFor(values)
        default:
          return []
      }
    },
  }
}

export default buildPaperGeneratorCascade
