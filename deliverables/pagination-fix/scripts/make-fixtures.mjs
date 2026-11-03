/**
 * Synthetic fixtures for the Premium PDF pagination fix.
 *
 * These payloads are NOT production data. The exact failing examination
 * "JEE Main Mock Test - Phase 2 - 2026-10-31" is not present in this clean
 * checkout; `failing-jee-phase2.json` is a calibrated local equivalent that
 * recreates the same oversized `mistake-topic-columns` failure. The 180-question
 * NEET payload is a local integration fixture for long-report validation.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'

const REPO_ROOT = new URL('../../../', import.meta.url)
const CANONICAL = new URL('backend/app/data/spa/student-portal.json', REPO_ROOT)
const OUT = new URL('../fixtures/', import.meta.url)
const DELIVERABLES = new URL('../', import.meta.url)
const canonical = JSON.parse(await readFile(CANONICAL, 'utf8')).examAnalysis

const envInt = (name, fallback) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

const TOPICS = envInt('PAGINATION_TOPICS', 14)
const WEAK = envInt('PAGINATION_WEAK', 8)
const MISTAKES = envInt('PAGINATION_MISTAKES', 4)
const TOPIC_WORDS = envInt('PAGINATION_TOPIC_WORDS', 7)
const EVIDENCE_CHARS = envInt('PAGINATION_EVIDENCE_CHARS', 180)

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']
const LEVELS = ['Critical', 'Weak', 'Average', 'Strong']

function topicName(index, words = TOPIC_WORDS) {
  const base = [
    'Non-equilibrium reversible heat transfer with variable coefficients',
    'Rotational dynamics of coupled rigid bodies and constrained axes',
    'Electromagnetic induction in time-varying multilayer geometries',
    'Bayesian classification of multi-stage stochastic processes',
    'Coordination chemistry of extended ligand field transitions',
    'Vector calculus in non-uniform curvilinear coordinate systems',
  ][index % 6]
  const filler = Array.from({ length: words }, (_, i) => `calibration-${String(index).padStart(3, '0')}-${i + 1}`).join(' ')
  return `${base}  ·  ${filler}`
}

function failingPayload() {
  const data = structuredClone(canonical)
  data.meta = {
    ...data.meta,
    examId: 'JEE-PHASE2-2026-10-31-LOCAL-EQUIVALENT',
    examName: 'JEE Main Mock Test - Phase 2 - 2026-10-31 (calibrated local equivalent)',
    course: 'JEE Main',
    pattern: 'JEE Main (Paper 1)',
    student: 'Calibrated Local Student',
    rollNo: 'PAGINATION-001',
    date: '2026-10-31',
    totalMarks: 300,
    duration: '3 hrs',
    sections: SUBJECTS,
    examStatus: 'Synthetic local reproduction',
  }
  data.topics = Array.from({ length: TOPICS }, (_, index) => ({
    topic: topicName(index),
    subject: SUBJECTS[index % SUBJECTS.length],
    mastery: 30 + (index * 7) % 65,
    level: LEVELS[index % LEVELS.length],
  }))
  data.mistakes = Array.from({ length: MISTAKES }, (_, index) => ({
    category: `Calibration mistake pattern ${String(index + 1).padStart(2, '0')} with extended diagnostic wording`,
    count: 1 + (index % 9),
  }))
  data.mistakeList = Array.from({ length: 8 }, (_, index) => ({
    q: `Q${index + 1}`,
    subject: SUBJECTS[index % SUBJECTS.length],
    category: data.mistakes[index % data.mistakes.length].category,
    topic: topicName(index),
    detail: `Source evidence ${index + 1}: ${'the student applied an inconsistent boundary condition and propagated the sign error through the final derivation. '.repeat(Math.ceil(EVIDENCE_CHARS / 110))}`,
  }))
  data.recommendations = {
    ...data.recommendations,
    weakTopics: Array.from({ length: WEAK }, (_, index) => topicName(index + 1000)),
    priorityRevision: Array.from({ length: 6 }, (_, index) => ({
      topic: topicName(index + 2000, 3),
      priority: ['Critical', 'High', 'Medium'][index % 3],
      timeframe: ['48 hours', '5 days', '7 days'][index % 3],
    })),
  }
  return data
}

function neet180Payload() {
  const data = structuredClone(canonical)
  const subjects = ['Physics', 'Chemistry', 'Biology']
  const chapters = {
    Physics: ['Mechanics', 'Electrodynamics', 'Thermodynamics', 'Modern Physics'],
    Chemistry: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry', 'Biomolecules'],
    Biology: ['Botany', 'Zoology', 'Genetics', 'Human Physiology'],
  }
  const topics = {
    Physics: ['Kinematics', 'Rotational Motion', 'Electrostatics', 'Semiconductors'],
    Chemistry: ['Mole Concept', 'Chemical Kinetics', 'Coordination Compounds', 'Aldehydes'],
    Biology: ['Cell Biology', 'Plant Physiology', 'Genetics', 'Circulation'],
  }
  const longExplanation = [
    'Complete solution. The governing relation is derived from the conservation law and the boundary conditions.',
    '$$\\int_0^1 \\frac{x^2}{\\sqrt{1-x^2}}\\,dx = \\frac{\\pi}{4}.$$',
    'Substitute $x=\\sin\\theta$, so $dx=\\cos\\theta\\,d\\theta$. The limits remain $0$ and $\\pi/2$.',
    'Check every sign convention, unit and limiting case before selecting the final option. This explanation is intentionally long enough to exercise multi-page solution-line continuation while preserving the full source text verbatim.',
  ].join(' ')
  const veryLongExplanation = `${longExplanation} `.repeat(6)
  const questionReview = Array.from({ length: 180 }, (_, i) => {
    const index = i + 1
    const subject = subjects[Math.floor(i / 60)]
    const chapter = chapters[subject][i % 4]
    const topic = topics[subject][i % 4]
    const status = i % 11 === 0 ? 'Skipped' : (i % 4 === 0 ? 'Incorrect' : 'Correct')
    const correct = ['A', 'B', 'C', 'D'][i % 4]
    const selected = status === 'Skipped' ? null : (status === 'Incorrect' ? ['A', 'B', 'C', 'D'][(i + 1) % 4] : correct)
    const isLong = index === 37 || index === 89 || index === 143 || index === 180
    const text = isLong
      ? `NEET calibration question ${index}: ${'A multi-stage assertion requires careful comparison of the governing equation, dimensional consistency, limiting behaviour and the experimental boundary conditions. '.repeat(8)} Which conclusion is correct?`
      : `NEET ${subject} question ${index}: evaluate the statement about ${topic} in ${chapter} and select the correct option.`
    const options = [
      'The first conclusion follows directly from the governing relation.',
      'Only the second conclusion is consistent with the limiting case.',
      'Both conclusions are valid after applying the boundary conditions.',
      'A very long alternative answer that must wrap without clipping or truncating the option text.',
    ]
    return {
      q: `Q${String(index).padStart(3, '0')}`,
      subject,
      chapter,
      topic,
      difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
      type: 'MCQ',
      status,
      marks: status === 'Correct' ? 4 : (status === 'Incorrect' ? -1 : 0),
      time: Number((0.8 + (i % 13) * 0.37).toFixed(2)),
      selected,
      correctAnswer: correct,
      text,
      options,
      explanation: isLong ? veryLongExplanation : longExplanation,
      hint: i % 5 === 0 ? 'Recheck the limiting case and the sign of the final term.' : undefined,
      mistakeCategory: status === 'Incorrect' ? (i % 2 ? 'Concept Error' : 'Calculation Error') : undefined,
      mistakeHint: status === 'Incorrect' ? `Calibration mistake note for ${subject} question ${index}: the chosen option reverses the boundary condition.` : undefined,
    }
  })
  data.meta = {
    ...data.meta,
    examId: 'NEET-180-LOCAL-2026-11',
    examName: 'NEET UG Full Syllabus Mock — 180 Questions (synthetic local integration)',
    course: 'NEET UG',
    pattern: 'NEET UG · Physics / Chemistry / Biology',
    student: 'NEET Long Report Fixture',
    rollNo: 'NEET-180-001',
    date: '2026-11-03',
    totalMarks: 720,
    duration: '3 hrs 20 min',
    sections: subjects,
    examStatus: 'Synthetic local integration',
  }
  data.hero = {
    ...data.hero,
    score: 512,
    maxScore: 720,
    percentage: 71.1,
    grade: 'B+',
    rank: 128,
    percentile: 94.6,
    batchRank: 7,
    cohortSize: 120,
    overallAccuracy: 74.4,
    overallSpeed: 2.4,
    confidenceIndex: 81,
    readinessScore: 78,
    healthScore: 83,
    badge: 'Long-report validation',
    aiSummary: 'Synthetic 180-question NEET integration fixture. All Physics, Chemistry and Biology question blocks, explanations, answer comparisons, mistake notes, topic analysis and revision priorities are retained. This is not a real student report.',
  }
  data.questionIntelligence = {
    ...data.questionIntelligence,
    total: 180,
    attempted: 164,
    correct: 123,
    incorrect: 41,
    skipped: 16,
    successRate: 75.0,
    accuracy: 75.0,
    negativeMarks: 41,
    guessAttempts: 7,
    attemptRatio: 91.1,
  }
  data.attempt = { elapsedSeconds: 10800 }
  data.subjects = subjects.map((name, i) => ({
    name,
    score: [176, 168, 168][i],
    maxMarks: 180,
    accuracy: [78, 72, 73][i],
    time: [62, 58, 60][i],
    rank: i + 2,
    difficulty: ['Medium', 'Hard', 'Medium'][i],
    attempted: [56, 54, 54][i],
    correct: [44, 39, 40][i],
    weakAreas: [topics[name][1]],
    strongAreas: [topics[name][0]],
  }))
  data.chapters = subjects.flatMap((subject, s) => chapters[subject].map((chapter, c) => ({
    chapter,
    subject,
    accuracy: 45 + ((s * 4 + c) * 7) % 50,
    marks: 8 + c,
    time: 12 + c * 2,
    attempted: 80 + c,
    mastery: LEVELS[(s + c) % LEVELS.length],
  })))
  data.topics = subjects.flatMap((subject, s) => topics[subject].map((topic, t) => ({
    topic,
    subject,
    mastery: 38 + ((s * 4 + t) * 9) % 58,
    level: LEVELS[(s + t) % LEVELS.length],
  })))
  data.mistakes = [
    { category: 'Concept Error', count: 18 },
    { category: 'Calculation Error', count: 13 },
    { category: 'Formula Error', count: 6 },
    { category: 'Time Pressure', count: 4 },
  ]
  data.mistakeList = Array.from({ length: 18 }, (_, i) => ({
    q: `Q${String(i * 10 + 1).padStart(3, '0')}`,
    subject: subjects[i % 3],
    category: data.mistakes[i % data.mistakes.length].category,
    topic: topics[subjects[i % 3]][i % 4],
    detail: `Complete mistake evidence ${i + 1}: the response and the published explanation differ at the boundary-condition step; the full source detail is retained for validation.`,
  }))
  data.difficulty = [
    { level: 'Easy', questions: 60, accuracy: 86, attempted: 60, time: 1.8 },
    { level: 'Medium', questions: 75, accuracy: 74, attempted: 72, time: 2.6 },
    { level: 'Hard', questions: 45, accuracy: 58, attempted: 32, time: 4.1 },
  ]
  data.timeIntelligence = {
    ...data.timeIntelligence,
    avgTimePerQuestion: 2.6,
    navigationCount: 213,
    timeManagementScore: 79,
    fastestQuestion: { q: 'Q001', time: 0.8 },
    slowestQuestion: { q: 'Q180', time: 5.1 },
    distribution: subjects.map((section, i) => ({ section, allocated: 60, used: 58 - i * 2, efficiency: 108 + i * 3 })),
  }
  data.comparison = {
    ...data.comparison,
    previousTest: { label: 'Previous NEET mock', score: 486, percentile: 91.2, grade: 'B' },
    batchAverage: { label: 'Batch average', score: 442, percentile: 84.4 },
    deltas: [{ label: 'vs previous test', value: '+26', up: true }],
  }
  data.recommendations = {
    ...data.recommendations,
    weakChapters: ['Organic Chemistry', 'Human Physiology', 'Electrodynamics'],
    weakTopics: ['Chemical Kinetics', 'Circulation', 'Semiconductors', 'Genetics'],
    priorityRevision: Array.from({ length: 12 }, (_, i) => ({
      topic: `${subjects[i % 3]} ${topics[subjects[i % 3]][i % 4]} priority ${i + 1}`,
      priority: ['Critical', 'High', 'Medium'][i % 3],
      timeframe: ['48 hours', '5 days', '7 days', '10 days'][i % 4],
    })),
  }
  data.prediction = {
    ...data.prediction,
    jeePercentile: 94.6,
    expectedAIR: 8400,
    riskLevel: 'Low',
  }
  data.questionReview = questionReview
  return data
}

function oversizedTopicPayload() {
  const data = structuredClone(canonical)
  const long = `Single oversized topic calibration entry: ${'multi-stage reversible non-equilibrium thermodynamic reasoning with extended boundary conditions and repeated diagnostic evidence '.repeat(38)} END-OF-OVERSIZED-TOPIC`
  data.meta = {
    ...data.meta,
    examId: 'OVERSIZED-TOPIC-LOCAL-01',
    examName: 'Oversized single topic entry (synthetic local reproduction)',
    student: 'Oversized Topic Fixture',
    rollNo: 'OVERSIZE-001',
    date: '2026-11-03',
    sections: SUBJECTS,
  }
  data.topics = [
    { topic: long, subject: 'Physics', mastery: 31, level: 'Critical' },
    { topic: 'Short companion topic', subject: 'Chemistry', mastery: 74, level: 'Strong' },
  ]
  data.recommendations = {
    ...data.recommendations,
    weakTopics: [long, 'Short companion topic'],
    priorityRevision: [{ topic: long, priority: 'Critical', timeframe: '48 hours' }],
  }
  data.mistakeList = [{
    q: 'Q1', subject: 'Physics', category: 'Concept Error', topic: long,
    detail: `Single oversized source evidence: ${'the complete derivation and its boundary conditions must remain readable across continuation pages without truncation '.repeat(20)} END-OF-OVERSIZED-EVIDENCE`,
  }]
  data.mistakes = [{ category: 'Concept Error', count: 3 }]
  return data
}

function longQuestionPayload() {
  const data = structuredClone(canonical)
  const longQuestion = `Long question calibration: ${'A composite system is analysed under several coupled constraints, and each option describes a different limiting behaviour that must be compared with the full derivation. '.repeat(28)} Select the correct conclusion.`
  const longExplanation = `Long explanation calibration: ${'The solution proceeds by conserving the relevant quantity, applying the boundary conditions, checking dimensions, and then comparing every answer option with the derived limiting case. '.repeat(90)} END-OF-LONG-EXPLANATION`
  data.meta = {
    ...data.meta,
    examId: 'LONG-QUESTION-LOCAL-01',
    examName: 'Long question and explanation (synthetic local reproduction)',
    student: 'Long Question Fixture',
    rollNo: 'LONGQ-001',
    date: '2026-11-03',
    sections: SUBJECTS,
  }
  data.questionReview = [
    {
      q: 'Q1', subject: 'Physics', chapter: 'Mechanics', topic: 'Rotational Motion',
      difficulty: 'Hard', type: 'MCQ', status: 'Incorrect', marks: -1, time: 7.8,
      selected: 'B', correctAnswer: 'D', text: longQuestion,
      options: [
        'A very long first answer option that must wrap without being split across a page boundary.',
        'The second answer option is deliberately short but still must remain associated with Q1.',
        'The third answer option restates the boundary condition and the limiting case in full.',
        'The fourth answer option is the published correct response and includes its full reasoning.',
      ],
      explanation: longExplanation,
      hint: 'Check the limiting case and the sign convention before choosing.',
      mistakeCategory: 'Concept Error',
      mistakeHint: 'The selected option reverses the boundary condition.',
    },
    {
      q: 'Q2', subject: 'Chemistry', chapter: 'Chemical Kinetics', topic: 'Rate Laws',
      difficulty: 'Easy', type: 'MCQ', status: 'Correct', marks: 4, time: 1.2,
      selected: 'A', correctAnswer: 'A', text: 'Short companion question after the oversized block.',
      options: ['Correct', 'Incorrect', 'Incorrect', 'Incorrect'],
      explanation: 'The rate law follows directly from the published mechanism.',
    },
  ]
  data.questionIntelligence = { ...data.questionIntelligence, total: 2, attempted: 2, correct: 1, incorrect: 1, skipped: 0 }
  return data
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const fixtures = {
    'failing-jee-phase2.json': failingPayload(),
    'neet-180.json': neet180Payload(),
    'oversized-topic.json': oversizedTopicPayload(),
    'long-question.json': longQuestionPayload(),
  }
  for (const [name, data] of Object.entries(fixtures)) {
    await writeFile(new URL(name, OUT), `${JSON.stringify(data, null, 2)}\n`)
  }
  // Staff exports must carry the analysed student's identity, not the signed-in
  // staff member's name. The real role paths already resolve this via the 360
  // profile; these local fixtures use the canonical student identity for all
  // three role/action combinations.
  const studentIdentity = { fullName: 'Aarav Sharma', rollNo: '21CS114' }
  const roles = {
    student: studentIdentity,
    faculty: studentIdentity,
    admin: studentIdentity,
  }
  const base = structuredClone(canonical)
  for (const [role, user] of Object.entries(roles)) {
    await writeFile(new URL(`role-${role}.json`, OUT), `${JSON.stringify({ user, data: base }, null, 2)}\n`)
  }
  await writeFile(new URL('FIXTURE_NOTICE.txt', OUT),
    'SYNTHETIC / LOCAL INTEGRATION FIXTURES — NOT PRODUCTION DATA\n\n'
    + 'The original failing production examination payload is not present in this clean checkout. '
    + 'failing-jee-phase2.json is a calibrated local equivalent used to reproduce the oversized '
    + 'mistake-topic-columns failure. neet-180.json, oversized-topic.json and long-question.json '
    + 'are synthetic long-report fixtures. role-*.json use the canonical in-app payload with local '
    + 'identity overrides for the six role/action combinations.\n')
  await writeFile(new URL('fixture-config.json', DELIVERABLES), `${JSON.stringify({
    generatedAt: new Date('2026-11-03T00:00:00Z').toISOString(),
    topics: TOPICS, weakTopics: WEAK, mistakes: MISTAKES,
    topicWords: TOPIC_WORDS, evidenceChars: EVIDENCE_CHARS,
    synthetic: true,
  }, null, 2)}\n`)
  console.log(JSON.stringify({ fixtures: Object.keys(fixtures), roles: Object.keys(roles), TOPICS, WEAK, MISTAKES }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
