/**
 * Generate V2 publication deliverables and synthetic QA fixtures.
 *
 *   cd frontend && npm run pdf:generate
 *
 * Student-facing reports use the canonical in-app exam-analysis payload. QA
 * PDFs are explicitly synthetic and cover 2/3 subjects, long chapter names,
 * long mathematical explanations and derivations, missing optional fields,
 * 30+ question-review rows, different scores, large revision lists and
 * different page counts. A consolidated layout-audit.json is written for the
 * independent geometric verifier.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'

import { buildPremiumFullModel, buildPremiumIntelligenceModel } from '../src/pages/student/premium-pdf/model.js'
import { renderPremiumPdf } from '../src/pages/student/premium-pdf/renderer.js'

const ROOT_DELIVERABLES = new URL('../../deliverables/', import.meta.url)
const CANONICAL = new URL('../../backend/app/data/spa/student-portal.json', import.meta.url)
const ASSETS = {
  logo: new URL('../src/assets/logo.png', import.meta.url),
  Inter: new URL('../src/assets/fonts/Inter-Regular.ttf', import.meta.url),
  InterSemi: new URL('../src/assets/fonts/Inter-SemiBold.ttf', import.meta.url),
  InterBold: new URL('../src/assets/fonts/Inter-Bold.ttf', import.meta.url),
  Manrope: new URL('../src/assets/fonts/Manrope-Bold.ttf', import.meta.url),
  STIXMath: new URL('../src/assets/fonts/STIXTwoMath-Regular.ttf', import.meta.url),
  STIXText: new URL('../src/assets/fonts/STIXTwoText-Regular.ttf', import.meta.url),
}

const LONG_CHAPTER = 'Thermodynamics and Statistical Mechanics — Advanced Applications in Multi-Stage Reversible Processes with Non-Ideal Corrections and Extended Derivations'
const LONG_TOPIC = 'Non-equilibrium reversible heat transfer with variable coefficients and extended boundary conditions'

const MATH_EXPLANATIONS = [
  'The integral reduces directly: $$\\int_0^1 \\frac{x^2}{\\sqrt{1-x^2}}\\,dx = \\frac{\\pi}{4}.$$ The substitution $x = \\sin\\theta$ gives $dx = \\cos\\theta\\,d\\theta$ and the limits remain $0$ to $\\pi/2$. This derivation is intentionally long enough to test multi-line mathematical flow and vector rendering without shortening any source expression.',
  'Using $$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6},$$ and noting $\\alpha^2 + \\beta^2 \\leq \\sqrt{\\gamma}$, the solution follows. Charge balance for $\\ce{H2SO4}$ and $1.6 \\times 10^{-19}$ C is preserved. Greek symbols, scripts, roots and scientific notation all remain in the source explanation.',
  'A multi-line derivation: $$\\begin{aligned} a &= b + c + \\frac{1}{2} \\\\ d &= e + f - \\sqrt{\\lambda} \\\\ \\therefore\\; a+d &= b+c+e+f \\\\end{aligned}$$ with $\\Delta E = q + w$ and $\\nabla \\cdot \\mathbf{E} = \\rho/\\varepsilon_0$. The solution continues with $\\int_0^\\infty e^{-x^2}\\,dx = \\sqrt{\\pi}/2$ and $\\lim_{n\\to\\infty} (1+1/n)^n = e$.',
  'FLAGGED SOURCE — do not correct: $\\frac{1}{2$ is malformed and must be shown verbatim for verification. The following display expression is also deliberately unbalanced: $$\\int_0^1 \\frac{x}{\\sqrt{1-x^2}$$. Neither fragment is guessed or silently repaired.',
]

async function loadAssets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => {
    const buffer = await readFile(url)
    return [name, new Uint8Array(buffer)]
  }))
  const flat = Object.fromEntries(entries)
  const { logo, ...fonts } = flat
  return { logo, fonts }
}

function twoSubjectStressFixture() {
  const questionReview = Array.from({ length: 32 }, (_, i) => {
    const index = i + 1
    const subject = i % 3 === 0 ? 'Chemistry' : 'Physics'
    const missing = i % 7 === 0
    return {
      q: `Q${index}`,
      subject,
      chapter: i % 5 === 0 ? LONG_CHAPTER : (subject === 'Physics' ? 'Rotational Motion' : 'Chemical Kinetics'),
      topic: i % 4 === 0 ? LONG_TOPIC : 'Projectile motion',
      difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
      type: ['MCQ', 'Numerical', 'Assertion Reason'][i % 3],
      status: ['Correct', 'Incorrect', 'Skipped'][i % 3],
      marks: i % 3 === 1 ? -1 : 4,
      time: missing ? 0 : Number((1.2 + (i % 9) * 0.7).toFixed(1)),
      selected: missing ? null : i % 4,
      correctAnswer: missing ? null : (i + 1) % 4,
      text: `Evaluate the expression for case ${index}: $x^{${index}} + \\sqrt{${index}} + \\sum_{k=1}^{${index}} k$.`,
      options: missing ? undefined : ['2 s', '√3 s', '4 s', 'A very long alternative answer that must wrap without clipping the card'],
      explanation: MATH_EXPLANATIONS[i % MATH_EXPLANATIONS.length],
      hint: i % 6 === 0 ? 'Check the sign convention and the limits of integration carefully.' : undefined,
      mistakeCategory: i % 3 === 1 ? 'Concept Error' : undefined,
      mistakeHint: i % 9 === 0 ? 'Used u = x² instead of u = x²+1' : undefined,
    }
  })
  const chapters = Array.from({ length: 8 }, (_, i) => ({
    chapter: i === 0 ? LONG_CHAPTER : `${i % 2 ? 'Chemical Kinetics' : 'Rotational Motion'} ${i + 1}`,
    subject: i % 2 ? 'Chemistry' : 'Physics',
    accuracy: 42 + i * 6,
    marks: 4 + i,
    time: 3 + i,
    attempted: 70 + i * 3,
    mastery: ['Critical', 'Weak', 'Average', 'Strong'][i % 4],
  }))
  return {
    meta: {
      examId: 'QA-EDGE-2026-01', examName: 'QA Stress Fixture — variable subjects, scores and question counts',
      course: 'Synthetic validation paper', pattern: 'Mixed format', student: 'QA Fixture', rollNo: 'QA-0001',
      date: '2026-11-02', totalMarks: 360, duration: '3 hrs', sections: ['Physics', 'Chemistry'], examStatus: 'Synthetic',
    },
    hero: {
      score: 217, maxScore: 360, percentage: 60.3, grade: 'B', rank: 91, percentile: 88.2,
      batchRank: 4, cohortSize: 60, overallAccuracy: 66.7, overallSpeed: 2.8,
      confidenceIndex: 74, readinessScore: 70, healthScore: 79, badge: 'Synthetic QA',
      aiSummary: 'This is a synthetic edge-case fixture used only to validate pagination, mathematical typesetting, long labels, missing optional values and dynamic subject combinations. It is not a student report.',
    },
    questionIntelligence: {
      total: 32, attempted: 29, correct: 19, incorrect: 10, skipped: 3,
      successRate: 66.7, accuracy: 66.7, negativeMarks: 9, guessAttempts: 2, attemptRatio: 90.7,
    },
    attempt: { elapsedSeconds: 5400 },
    subjects: [
      { name: 'Physics', score: 121, maxMarks: 180, accuracy: 67, time: 48, rank: 2, difficulty: 'Medium', attempted: 18, correct: 12, weakAreas: ['Rotational Motion'], strongAreas: ['Kinematics'] },
      { name: 'Chemistry', score: 96, maxMarks: 180, accuracy: 53, time: 42, rank: 4, difficulty: 'Hard', attempted: 11, correct: 7, weakAreas: ['Chemical Kinetics'], strongAreas: ['Mole Concept'] },
    ],
    chapters,
    topics: [
      { topic: 'Definite Integration', subject: 'Physics', mastery: 44, level: 'Critical' },
      { topic: LONG_TOPIC, subject: 'Physics', mastery: 51, level: 'Weak' },
      { topic: 'Bayes theorem', subject: 'Physics', mastery: 62, level: 'Average' },
      { topic: 'Coordination compounds', subject: 'Chemistry', mastery: 48, level: 'Weak' },
      { topic: 'Chemical Kinetics', subject: 'Chemistry', mastery: 82, level: 'Strong' },
      { topic: 'Mole Concept', subject: 'Chemistry', mastery: 91, level: 'Strong' },
    ],
    mistakes: [
      { category: 'Concept Error', count: 5 }, { category: 'Calculation Error', count: 4 },
      { category: 'Formula Error', count: 3 }, { category: 'Time Pressure', count: 2 },
    ],
    mistakeList: [
      { q: 'Q4', subject: 'Physics', category: 'Concept Error', topic: 'Definite Integration', detail: 'Misapplied substitution — used u = x² instead of u = x²+1' },
      { q: 'Q11', subject: 'Chemistry', category: 'Calculation Error', topic: 'Chemical Kinetics', detail: 'Decimal error in 1/r² computation' },
    ],
    difficulty: [
      { level: 'Easy', questions: 10, accuracy: 82, attempted: 10, time: 2.1 },
      { level: 'Medium', questions: 12, accuracy: 66, attempted: 11, time: 3.4 },
      { level: 'Hard', questions: 10, accuracy: 41, attempted: 8, time: 5.2 },
    ],
    timeIntelligence: {
      avgTimePerQuestion: 3.0, fastestQuestion: { q: 'Q1 — Kinematics', time: 0.7 },
      slowestQuestion: { q: 'Q31 — Definite Integration', time: 7.9 }, navigationCount: 11, timeManagementScore: 68,
      distribution: [
        { section: 'Physics', allocated: 60, used: 48, efficiency: 125 },
        { section: 'Chemistry', allocated: 60, used: 42, efficiency: 143 },
      ],
    },
    comparison: {
      previousTest: { label: 'Previous test', score: 198, percentile: 84.1, grade: 'B' },
      batchAverage: { label: 'Batch average', score: 176, percentile: 80.2 },
      deltas: [{ label: 'vs previous test', value: '+19', up: true }],
    },
    recommendations: {
      weakChapters: ['Calculus (44%)', 'Chemical Kinetics (48%)'],
      weakTopics: ['Definite Integration', 'Coordination compounds', LONG_TOPIC],
      priorityRevision: [
        { topic: 'Definite Integration — substitution', priority: 'Critical', timeframe: '48 hours' },
        { topic: 'Chemical Kinetics — rate laws', priority: 'High', timeframe: '5 days' },
      ],
      suggestedPYQs: [{ title: 'JEE Main 2024 — Integration (5 Qs)', source: 'PYQ Bank' }],
      practiceQuestions: [{ title: '20-question drill — substitution', count: 20, difficulty: 'Medium' }],
      mockTests: [{ title: 'Sectional mock — Chemistry', mode: 'Sectional' }],
      lectures: [{ title: 'Kinetics masterclass', type: 'Video' }],
    },
    prediction: {
      jeePercentile: 91.1, neetScore: null, expectedAIR: 21400, riskLevel: 'Medium',
      expectedImprovement: '+3.1%', targetProbability: 77,
      trajectory: [{ exam: 'QA 1', score: 190 }, { exam: 'QA 2', score: 217 }],
    },
    questionReview,
  }
}

function threeSubjectLargeRevisionFixture(canonical) {
  const data = structuredClone(canonical)
  data.meta.examId = 'QA-LARGE-2026-03'
  data.meta.examName = 'QA Three-Subject Fixture — extensive revision priorities and mathematical solutions'
  data.meta.sections = ['Physics', 'Chemistry', 'Mathematics']
  data.meta.totalMarks = 360
  data.hero.score = 244
  data.hero.maxScore = 360
  data.hero.percentage = 67.8
  data.hero.grade = 'A'
  data.hero.rank = 1260
  data.hero.percentile = 94.2
  data.hero.overallAccuracy = 73.9
  data.hero.aiSummary = 'Synthetic three-subject fixture with a deliberately large published revision list and long mathematical explanations. It is not a student report.'
  data.questionIntelligence.total = 90
  data.questionIntelligence.attempted = 84
  data.questionIntelligence.correct = 61
  data.questionIntelligence.incorrect = 23
  data.questionIntelligence.skipped = 6
  data.questionIntelligence.accuracy = 72.6
  data.questionIntelligence.successRate = 70.1
  data.subjects = [
    { name: 'Physics', score: 88, maxMarks: 120, accuracy: 76, time: 52, rank: 6, difficulty: 'Medium', attempted: 28, correct: 21, weakAreas: [LONG_CHAPTER], strongAreas: ['Mechanics'] },
    { name: 'Chemistry', score: 80, maxMarks: 120, accuracy: 71, time: 48, rank: 9, difficulty: 'Easy', attempted: 29, correct: 21, weakAreas: ['Coordination Compounds'], strongAreas: ['Physical Chemistry'] },
    { name: 'Mathematics', score: 76, maxMarks: 120, accuracy: 63, time: 61, rank: 14, difficulty: 'Hard', attempted: 27, correct: 19, weakAreas: ['Definite Integration'], strongAreas: ['Algebra'] },
  ]
  data.chapters = data.chapters.map((chapter, index) => ({
    ...chapter,
    chapter: index === 0 ? LONG_CHAPTER : chapter.chapter,
    accuracy: 44 + ((index * 7) % 48),
    marks: 6 + index,
    time: 4 + (index % 7),
  }))
  data.topics = data.topics.map((topic, index) => ({
    ...topic,
    topic: index === 0 ? LONG_TOPIC : topic.topic,
    mastery: 38 + ((index * 9) % 58),
    level: ['Critical', 'Weak', 'Average', 'Strong'][index % 4],
  }))
  data.recommendations.weakChapters = [
    LONG_CHAPTER, 'Calculus (48%)', 'Probability & Stats (45%)', 'Coordination Compounds (52%)',
    'Ray Optics (55%)', 'Organic Reaction Mechanisms (49%)',
  ]
  data.recommendations.weakTopics = [
    LONG_TOPIC, 'Definite Integration', '3D Geometry', 'Ray Optics sign convention',
    'Coordination Compounds — NCERT tables', 'Probability — Bayes & distributions',
    'Thermodynamic non-ideal corrections', 'Electrostatic boundary conditions',
  ]
  data.recommendations.priorityRevision = Array.from({ length: 12 }, (_, i) => ({
    topic: `${['Critical', 'High', 'Medium'][i % 3]} priority topic ${i + 1} — ${i % 2 ? LONG_TOPIC : 'Definite Integration — properties & substitution'}`,
    priority: ['Critical', 'High', 'Medium'][i % 3],
    timeframe: ['48 hours', '5 days', '7 days', '10 days'][i % 4],
  }))
  data.questionReview = data.questionReview.map((row, index) => ({
    ...row,
    chapter: index === 0 ? LONG_CHAPTER : row.chapter,
    topic: index % 2 ? LONG_TOPIC : row.topic,
    text: `Derive case ${index + 1}: $\\frac{d}{dx}\\left(x^{${index + 2}}\\sqrt{1-x^2}\\right)$ and evaluate $\\sum_{{k=1}}^{${index + 3}} k^2$.`,
    options: ['$$\\frac{\\pi}{4}$$', '√3 s', '4 s', 'A very long alternative answer that must wrap without clipping the question area'],
    selected: index % 4,
    correctAnswer: (index + 1) % 4,
    explanation: MATH_EXPLANATIONS[index % MATH_EXPLANATIONS.length],
    hint: index % 3 === 0 ? 'Check the sign convention and the limits of integration carefully.' : undefined,
    mistakeHint: index % 5 === 0 ? 'Used u = x² instead of u = x²+1' : undefined,
    mistakeCategory: index % 3 === 1 ? 'Concept Error' : undefined,
  }))
  return data
}

function minimalTwoSubjectFixture() {
  return {
    meta: {
      examId: 'QA-MIN-2026-02', examName: 'QA minimal two-subject fixture', course: 'Synthetic short paper',
      pattern: 'Short format', student: 'QA Short', rollNo: 'QA-0002', date: '2026-11-02',
      totalMarks: 120, duration: '90 min', sections: ['Physics', 'Chemistry'], examStatus: 'Synthetic',
    },
    hero: { score: 57, maxScore: 120, percentage: 47.5, grade: 'C', rank: 18, percentile: 61.2, overallAccuracy: 55, aiSummary: 'Synthetic short report with missing optional fields.' },
    questionIntelligence: { total: 6, attempted: 5, correct: 3, incorrect: 2, skipped: 1, accuracy: 60, successRate: 50 },
    attempt: { elapsedSeconds: 2700 },
    subjects: [
      { name: 'Physics', score: 31, maxMarks: 60, accuracy: 62, time: 22, rank: 6, difficulty: 'Medium', attempted: 3, correct: 2 },
      { name: 'Chemistry', score: 26, maxMarks: 60, accuracy: 48, time: 23, rank: 9, difficulty: 'Hard', attempted: 2, correct: 1 },
    ],
    chapters: [
      { chapter: 'Kinematics', subject: 'Physics', accuracy: 68, marks: 12, time: 8, mastery: 'Average' },
      { chapter: 'Chemical Kinetics', subject: 'Chemistry', accuracy: 42, marks: 8, time: 12, mastery: 'Critical' },
    ],
    topics: [
      { topic: 'Projectile motion', subject: 'Physics', mastery: 68, level: 'Average' },
      { topic: 'Rate laws', subject: 'Chemistry', mastery: 42, level: 'Critical' },
    ],
    mistakes: [{ category: 'Concept Error', count: 2 }],
    mistakeList: [{ q: 'Q2', subject: 'Chemistry', category: 'Concept Error', topic: 'Rate laws', detail: 'Used x² instead of x²+1 in the rate expression' }],
    difficulty: [{ level: 'Medium', questions: 4, accuracy: 60, attempted: 4, time: 3.2 }],
    timeIntelligence: {
      avgTimePerQuestion: 3.1, fastestQuestion: { q: 'Q1', time: 1.1 }, slowestQuestion: { q: 'Q3', time: 6.4 },
      navigationCount: 3, timeManagementScore: 58,
      distribution: [{ section: 'Physics', allocated: 45, used: 22, efficiency: 104 }],
    },
    comparison: { previousTest: { label: 'Previous test', score: 49, percentile: 58.4, grade: 'C' }, deltas: [{ label: 'vs previous test', value: '+8', up: true }] },
    recommendations: {},
    prediction: { jeePercentile: 74.2, neetScore: null, expectedAIR: 48000, riskLevel: 'Medium', expectedImprovement: '+2.0%', targetProbability: 52, trajectory: [{ exam: 'QA short 1', score: 49 }, { exam: 'QA short 2', score: 57 }] },
    questionReview: [
      { q: 'Q1', subject: 'Physics', chapter: 'Kinematics', topic: 'Projectile motion', type: 'MCQ', status: 'Correct', marks: 4, time: 1.1, selected: 0, correctAnswer: 0, explanation: 'The result is $\\frac{1}{2}gt^2$.' },
      { q: 'Q2', subject: 'Chemistry', chapter: 'Chemical Kinetics', topic: 'Rate laws', type: 'Numerical', status: 'Incorrect', marks: -1, time: 4.2, selected: 1, correctAnswer: 2, explanation: 'Use $\\int_0^t e^{-kt}\\,dt = \\frac{1-e^{-kt}}{k}$.' },
      { q: 'Q3', subject: 'Physics', chapter: 'Kinematics', topic: 'Projectile motion', type: 'MCQ', status: 'Skipped', marks: 0, time: 6.4, selected: null, correctAnswer: 1 },
    ],
  }
}

async function main() {
  await mkdir(ROOT_DELIVERABLES, { recursive: true })
  await mkdir(new URL('qa/', ROOT_DELIVERABLES), { recursive: true })
  const assets = await loadAssets()
  const canonical = JSON.parse(await readFile(CANONICAL, 'utf8')).examAnalysis
  const generatedAt = new Date('2026-11-02T09:00:00Z')
  const layoutAudit = { generatedAt: generatedAt.toISOString(), engine: 'premium-academic-editorial-v2', reports: {} }
  const results = {
    generatedAt: generatedAt.toISOString(),
    engine: 'premium-academic-editorial-v2',
    source: 'backend/app/data/spa/student-portal.json :: examAnalysis',
    note: 'The two named content-reference PDFs were not present in the workspace. These V2 deliverables preserve the canonical in-app analysis payload that feeds the same export workflow; no examination values were invented.',
    reports: {},
    qa: {},
  }

  async function renderOne({ slug, kind, data, subject = 'All Subjects', file, label, synthetic = false }) {
    const model = kind === 'full'
      ? buildPremiumFullModel({ data, subject, user: null, generatedAt })
      : buildPremiumIntelligenceModel({ data, subject, user: null, generatedAt })
    const result = await renderPremiumPdf({ kind, model, assets })
    await writeFile(new URL(file, ROOT_DELIVERABLES), result.bytes)
    layoutAudit.reports[slug] = result.layoutAudit
    const record = {
      file, label, pages: result.pageCount,
      sourceValues: result.sourceValueCount,
      missingValues: kind === 'full' ? result.missingValues : [],
      sourceValuesOutsideDigest: kind === 'intelligence' ? result.missingValues.length : 0,
      dataScope: kind === 'intelligence'
        ? 'Academic briefing; complete source-value preservation is verified against the Full Analysis Report.'
        : 'Complete canonical source-value preservation.',
      flags: result.flags,
      layout: result.auditSummary,
      synthetic,
    }
    if (synthetic) results.qa[slug] = record
    else results.reports[slug] = record
    if (kind === 'full' && result.missingValues.length) {
      throw new Error(`${slug} is missing ${result.missingValues.length} source values`)
    }
    if (!result.auditSummary.zeroUnintendedOverlaps) {
      throw new Error(`${slug} layout audit failed: ${JSON.stringify({
        textTextOverlaps: result.auditSummary.textTextOverlaps.length,
        textBarOverlaps: result.auditSummary.textBarOverlaps.length,
        siblingComponentOverlaps: result.auditSummary.siblingComponentOverlaps.length,
        componentBoundaryViolations: result.auditSummary.componentBoundaryViolations.length,
      })}`)
    }
    return record
  }

  await renderOne({
    slug: 'full', kind: 'full', data: canonical,
    file: 'MediXO_EduX_Full_Exam_Analysis_Report.pdf', label: 'Full Exam Analysis Report',
  })
  await renderOne({
    slug: 'intelligence', kind: 'intelligence', data: canonical,
    file: 'MediXO_EduX_Exam_Intelligence_Report.pdf', label: 'Exam Intelligence Report',
  })

  const fixtures = [
    { slug: 'full-edge-cases-2-subjects', kind: 'full', data: twoSubjectStressFixture(), file: 'qa/full-edge-cases-2-subjects.pdf', label: '2 subjects · 32 questions · long math and labels' },
    { slug: 'intelligence-edge-cases-2-subjects', kind: 'intelligence', data: twoSubjectStressFixture(), file: 'qa/intelligence-edge-cases-2-subjects.pdf', label: '2 subjects · intelligence edge cases' },
    { slug: 'full-large-revision-3-subjects', kind: 'full', data: threeSubjectLargeRevisionFixture(canonical), file: 'qa/full-large-revision-3-subjects.pdf', label: '3 subjects · 12 priority rows · long derivations' },
    { slug: 'intelligence-large-revision-3-subjects', kind: 'intelligence', data: threeSubjectLargeRevisionFixture(canonical), file: 'qa/intelligence-large-revision-3-subjects.pdf', label: '3 subjects · large revision strategy' },
    { slug: 'full-minimal-2-subjects', kind: 'full', data: minimalTwoSubjectFixture(), file: 'qa/full-minimal-2-subjects.pdf', label: '2 subjects · missing fields · short page count' },
    { slug: 'intelligence-minimal-2-subjects', kind: 'intelligence', data: minimalTwoSubjectFixture(), file: 'qa/intelligence-minimal-2-subjects.pdf', label: '2 subjects · minimal intelligence digest' },
  ]
  for (const fixture of fixtures) await renderOne({ ...fixture, synthetic: true })

  await writeFile(new URL('qa/QA_NOTICE.txt', ROOT_DELIVERABLES),
    'SYNTHETIC QA FIXTURES — NOT STUDENT DATA\n\n'
    + 'These V2 PDFs validate 2/3 subjects, long chapter and topic names, long mathematical explanations, multi-line derivations, missing optional values, 30+ question-review rows, different scores, large revision-priority lists and different page counts. Malformed expressions are deliberately included and shown verbatim for verification. They are not examination results.\n')
  await writeFile(new URL('generation-results.json', ROOT_DELIVERABLES), `${JSON.stringify(results, null, 2)}\n`)
  await writeFile(new URL('layout-audit.json', ROOT_DELIVERABLES), `${JSON.stringify(layoutAudit, null, 2)}\n`)
  console.log(JSON.stringify({
    reports: Object.fromEntries(Object.entries(results.reports).map(([k, v]) => [k, { pages: v.pages, layout: v.layout.zeroUnintendedOverlaps, missing: v.missingValues.length }])),
    qa: Object.fromEntries(Object.entries(results.qa).map(([k, v]) => [k, { pages: v.pages, layout: v.layout.zeroUnintendedOverlaps, flags: v.flags.length }])),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
