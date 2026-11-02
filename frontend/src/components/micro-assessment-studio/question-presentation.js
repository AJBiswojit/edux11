const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const INTERNAL_QUESTION_PREFIX = /^(source check|generation check|validation check|ai check|internal check|prototype check|debug)\s+\d+\s*:\s*/i

export function presentationQuestionText(question) {
  return String(question?.question ?? question?.questionText ?? '').trim()
}

export function containsInternalGenerationLabel(text) {
  return INTERNAL_QUESTION_PREFIX.test(String(text ?? ''))
}

export function formatFacultyAnswer(question) {
  const options = question?.options ?? []
  const answerIndex = question?.answerIndex ?? options.findIndex((option) => option === question?.correctAnswer)
  const type = String(question?.questionType ?? '')
  const raw = question?.correctAnswer

  if (options.length && answerIndex >= 0) {
    const letter = LETTERS[answerIndex] ?? String(answerIndex + 1)
    if (/mcq|conceptual|application|diagram|why/i.test(type) || options.length) {
      return `${letter}. ${options[answerIndex]}`
    }
  }

  if (raw == null || raw === '') return ''
  return String(raw)
}

export { LETTERS }
