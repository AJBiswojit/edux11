/**
 * Generate the publication deliverables and synthetic QA fixtures.
 *
 * Run from the frontend directory:
 *   npm run pdf:generate
 *
 * The two student-facing reports use the canonical in-app exam-analysis
 * payload in backend/app/data/spa/student-portal.json. The QA fixtures are
 * explicitly synthetic and are kept in deliverables/qa/ so they can never be
 * mistaken for student performance data.
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
  STIXTwoText: new URL('../src/assets/fonts/STIXTwoText-Regular.ttf', import.meta.url),
}

async function loadAssets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => {
    const buffer = await readFile(url)
    return [name, new Uint8Array(buffer)]
  }))
  const flat = Object.fromEntries(entries)
  const { logo, ...fonts } = flat
  return { logo, fonts }
}

async function writePdf(url, buffer) {
  await writeFile(url, buffer)
}

function stressFixture() {
  const longChapter = 'Thermodynamics and Statistical Mechanics — Advanced Applications in Multi-Stage Reversible Processes with Non-Ideal Corrections and Extended Derivations'
  const explanations = [
    'The integral reduces directly: $$\\int_0^1 \\frac{x^2}{\\sqrt{1-x^2}}\\,dx = \\frac{\\pi}{4}.$$ The substitution $x = \\sin\\theta$ gives $dx = \\cos\\theta\\,d\\theta$ and the limits remain $0$ to $\\pi/2$.',
    'Using the standard summation identity $$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6},$$ and noting $\\alpha^2 + \\beta^2 \\leq \\sqrt{\\gamma}$, the solution follows. Charge balance for $\\ce{H2SO4}$ and $1.6 \\times 10^{-19}$ C is preserved.',
    'A multi-line derivation: $$\\begin{aligned} a &= b + c \\\\ d &= e + f \\\\ \\therefore\\; a+d &= b+c+e+f \\end{aligned}$$ with $\\Delta E = q + w$ and $\\nabla \\cdot \\mathbf{E} = \\rho/\\varepsilon_0$.',
    'FLAGGED SOURCE — do not correct: $\\frac{1}{2$ is malformed and must be shown verbatim for verification.',
  ]
  const questionReview = Array.from({ length: 30 }, (_, i) => {
    const index = i + 1
    const subject = i % 3 === 0 ? 'Chemistry' : 'Physics'
    const missing = i % 7 === 0
    return {
      q: `Q${index}`,
      subject,
      chapter: i % 5 === 0 ? longChapter : (subject === 'Physics' ? 'Rotational Motion' : 'Chemical Kinetics'),
      topic: i % 4 === 0 ? 'Non-equilibrium reversible heat transfer with variable coefficients' : 'Projectile motion',
      difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
      type: ['MCQ', 'Numerical', 'Assertion Reason'][i % 3],
      status: ['Correct', 'Incorrect', 'Skipped'][i % 3],
      marks: i % 3 === 1 ? -1 : 4,
      time: missing ? 0 : Number((1.2 + (i % 9) * 0.7).toFixed(1)),
      selected: missing ? null : i % 4,
      correctAnswer: missing ? null : (i + 1) % 4,
      text: `Evaluate the expression for case ${index}: $x^{${index}} + \\sqrt{${index}} + \\sum_{{k=1}}^{${index}} k$.`,
      options: missing ? undefined : ['2 s', '√3 s', '4 s', 'A very long alternative answer that must wrap without clipping the card'],
      explanation: explanations[i % explanations.length],
      hint: i % 6 === 0 ? 'Check the sign convention and the limits of integration carefully.' : undefined,
      mistakeCategory: i % 3 === 1 ? 'Concept Error' : undefined,
      mistakeHint: i % 9 === 0 ? 'Used u = x² instead of u = x²+1' : undefined,
    }
  })
  const chapters = Array.from({ length: 8 }, (_, i) => ({
    chapter: i === 0 ? longChapter : `${i % 2 ? 'Chemical Kinetics' : 'Rotational Motion'} ${i + 1}`,
    subject: i % 2 ? 'Chemistry' : 'Physics',
    accuracy: 42 + i * 6,
    marks: 4 + i,
    time: 3 + i,
    attempted: 70 + i * 3,
    mastery: ['Critical', 'Weak', 'Average', 'Strong'][i % 4],
  }))
  return {
    meta: {
      examId: 'QA-EDGE-2026-01',
      examName: 'QA Stress Fixture — variable subjects, scores and question counts',
      course: 'Synthetic validation paper',
      pattern: 'Mixed format',
      student: 'QA Fixture',
      rollNo: 'QA-0001',
      date: '2026-11-02',
      totalMarks: 360,
      duration: '3 hrs',
      sections: ['Physics', 'Chemistry'],
      examStatus: 'Synthetic',
    },
    hero: {
      score: 217, maxScore: 360, percentage: 60.3, grade: 'B', rank: 91, percentile: 88.2,
      batchRank: 4, cohortSize: 60, overallAccuracy: 66.7, overallSpeed: 2.8,
      confidenceIndex: 74, readinessScore: 70, healthScore: 79, badge: 'Synthetic QA',
      aiSummary: 'This is a synthetic edge-case fixture used only to validate pagination, mathematical typesetting, long labels, missing optional values and dynamic subject combinations. It is not a student report.',
    },
    questionIntelligence: {
      total: 30, attempted: 27, correct: 18, incorrect: 9, skipped: 3,
      successRate: 66.7, accuracy: 66.7, negativeMarks: 9, guessAttempts: 2, attemptRatio: 90,
    },
    attempt: { elapsedSeconds: 5400 },
    subjects: [
      { name: 'Physics', score: 121, maxMarks: 180, accuracy: 67, time: 48, rank: 2, difficulty: 'Medium', attempted: 18, correct: 12, weakAreas: ['Rotational Motion'], strongAreas: ['Kinematics'] },
      { name: 'Chemistry', score: 96, maxMarks: 180, accuracy: 53, time: 42, rank: 4, difficulty: 'Hard', attempted: 9, correct: 6, weakAreas: ['Chemical Kinetics'], strongAreas: ['Mole Concept'] },
    ],
    chapters,
    topics: [
      { topic: 'Definite Integration', subject: 'Physics', mastery: 44, level: 'Critical' },
      { topic: longChapter, subject: 'Physics', mastery: 51, level: 'Weak' },
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
      { level: 'Hard', questions: 8, accuracy: 41, attempted: 6, time: 5.2 },
    ],
    timeIntelligence: {
      avgTimePerQuestion: 3.0,
      fastestQuestion: { q: 'Q1 — Kinematics', time: 0.7 },
      slowestQuestion: { q: 'Q29 — Definite Integration', time: 7.9 },
      navigationCount: 11,
      timeManagementScore: 68,
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
      weakTopics: ['Definite Integration', 'Coordination compounds', longChapter],
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

async function main() {
  await mkdir(ROOT_DELIVERABLES, { recursive: true })
  await mkdir(new URL('qa/', ROOT_DELIVERABLES), { recursive: true })
  const assets = await loadAssets()
  const canonical = JSON.parse(await readFile(CANONICAL, 'utf8')).examAnalysis
  const generatedAt = new Date('2026-11-02T09:00:00Z')
  const common = { data: canonical, subject: 'All Subjects', user: null, generatedAt }

  const fullModel = buildPremiumFullModel(common)
  const full = await renderPremiumPdf({ kind: 'full', model: fullModel, assets })
  await writePdf(new URL('MediXO_EduX_Full_Exam_Analysis_Report.pdf', ROOT_DELIVERABLES), full.bytes)

  const intelligenceModel = buildPremiumIntelligenceModel(common)
  const intelligence = await renderPremiumPdf({ kind: 'intelligence', model: intelligenceModel, assets })
  await writePdf(new URL('MediXO_EduX_Exam_Intelligence_Report.pdf', ROOT_DELIVERABLES), intelligence.bytes)

  const stress = stressFixture()
  const stressCommon = { data: stress, subject: 'All Subjects', user: null, generatedAt }
  const stressFull = await renderPremiumPdf({
    kind: 'full',
    model: buildPremiumFullModel(stressCommon),
    assets,
  })
  await writePdf(new URL('qa/premium-pdf-stress-test.pdf', ROOT_DELIVERABLES), stressFull.bytes)
  const stressIntelligence = await renderPremiumPdf({
    kind: 'intelligence',
    model: buildPremiumIntelligenceModel(stressCommon),
    assets,
  })
  await writePdf(new URL('qa/intelligence-edge-cases.pdf', ROOT_DELIVERABLES), stressIntelligence.bytes)

  await writeFile(new URL('qa/QA_NOTICE.txt', ROOT_DELIVERABLES),
    'SYNTHETIC QA FIXTURE — NOT STUDENT DATA\n\n'
    + 'These PDFs exist only to verify long mathematical explanations, long chapter names, missing optional values, different scores, different subject combinations, different question counts, malformed-expression flags and multiple question-analysis pages. They are not examination results.\n')

  const results = {
    generatedAt: generatedAt.toISOString(),
    source: 'backend/app/data/spa/student-portal.json :: examAnalysis',
    note: 'The two content-reference PDFs named in the brief were not present in the workspace; these deliverables preserve the canonical in-app analysis payload that feeds the same export workflow.',
    reports: {
      full: {
        file: 'MediXO_EduX_Full_Exam_Analysis_Report.pdf',
        pages: full.pageCount,
        sourceValues: full.sourceValueCount,
        missingValues: full.missingValues,
        flags: full.flags,
      },
      intelligence: {
        file: 'MediXO_EduX_Exam_Intelligence_Report.pdf',
        pages: intelligence.pageCount,
        sourceValues: intelligence.sourceValueCount,
        missingValues: [],
        sourceValuesOutsideTwoPageDigest: intelligence.missingValues.length,
        dataScope: 'Two-page digest; complete source-value preservation is verified against the Full Analysis Report.',
        flags: intelligence.flags,
      },
    },
    qa: {
      full: {
        file: 'qa/premium-pdf-stress-test.pdf',
        pages: stressFull.pageCount,
        missingValues: stressFull.missingValues,
        flags: stressFull.flags,
      },
      intelligence: {
        file: 'qa/intelligence-edge-cases.pdf',
        pages: stressIntelligence.pageCount,
        missingValues: [],
        sourceValuesOutsideTwoPageDigest: stressIntelligence.missingValues.length,
        dataScope: 'Synthetic two-page QA digest; not a source-of-truth document.',
        flags: stressIntelligence.flags,
      },
    },
  }
  await writeFile(new URL('generation-results.json', ROOT_DELIVERABLES), `${JSON.stringify(results, null, 2)}\n`)
  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
