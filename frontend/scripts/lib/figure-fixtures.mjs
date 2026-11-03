/**
 * Figure-rich QA fixtures for the premium PDF refinement.
 *
 * These are synthetic examination payloads layered on the real analysis shape.
 * Every figure path points at a genuine crop in `backend/media`, so the
 * generation harness embeds real examination figures rather than placeholders.
 * The fixtures deliberately include:
 *   · all supported stem-image field spellings (single, array, pipe-joined);
 *   · option images, including an image-only option;
 *   · explanation images, both as a field and inline in markdown;
 *   · PNG, JPEG, WebP and AVIF sources, plus an inline data URL;
 *   · a missing figure reference and a non-image "figure" string;
 *   · long explanations and long option text.
 */

const M = '/media/pdf_extract'

export const FIGURES = Object.freeze({
  circuit: `${M}/phase2-jee/phy_q10_q03_stem.png`,
  circuitDiagram: `${M}/phase2-jee/phy_q10_q06_stem.png`,
  mechanics: `${M}/phase2-jee/phy_q10_q01_stem.png`,
  chemistry: `${M}/phase2-jee/chem_q9_q12_stem.png`,
  chemistryOptionA: `${M}/phase2-jee/chem_q9_q12_opt_a.png`,
  chemistryOptionB: `${M}/phase2-jee/chem_q9_q12_opt_b.png`,
  chemistryOptionC: `${M}/phase2-jee/chem_q9_q12_opt_c.png`,
  chemistryOptionD: `${M}/phase2-jee/chem_q9_q12_opt_d.png`,
  mathOption1: `${M}/jee-mathematics/crops/p0001_qQ2_option_1.png`,
  mathOption2: `${M}/jee-mathematics/crops/p0001_qQ2_option_2.png`,
  mathOption3: `${M}/jee-mathematics/crops/p0001_qQ2_option_3.png`,
  mathOption4: `${M}/jee-mathematics/crops/p0001_qQ2_option_4.png`,
  geometry: `${M}/jee-mathematics/crops/p0001_qQ5_diagram_13.png`,
  embedded: `${M}/jee-physics/embedded/embedded_p0002_1.png`,
  webp: `${M}/qa-figures/circuit.webp`,
  avif: `${M}/qa-figures/circuit.avif`,
  missing: `${M}/qa-figures/does-not-exist.png`,
})

const INLINE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAwCAIAAABhdOiYAAABPklEQVR4nO3buxHCMAyAYYfLHMzBBFQUbMAG1DRUNNRswA4MwThp6Cl8pwtKHJHED8nSXyXQ5L6TVSVN132cFW5T+gG4Z0BEBkTU9m/uj2ep5+DW5XzyF23oD831B8WOGJEBEeEjprnd4eYvjvst/GhAzvVohqkGGrq8X1f3u6Q1AoVcRlMENHqOJmh8KoBmjQyqZqA1LlCFQFFcoHqAlq0YshqA4o4MSjBQUhdIHlAeF0gMUKIVQyYAKPPIoPgClXWB2AExcYG4AJVaMWTlgbiNDKoYEHMXKDeQFBcoExDbFUOWHEjcyKBSAUl3gSIDVeMCxQGSu2LI1gLVNzKohUDVu0DzgPS4QH8BVbxiyAgghSODGgcyFwgDIRq1LlDwiBmNDwOZC8pewSMyICJ8xOxVaVRjH7NMZ0eMyICIvuYOcH2qnnUBAAAAAElFTkSuQmCC'

const LONG_EXPLANATION = 'Complete solution. Apply the governing relation and substitute the values stated in the question. $$\\oint \\mathbf{E}\\cdot d\\mathbf{A} = \\frac{q_{enc}}{\\varepsilon_0}$$ The closed surface encloses the charge distribution shown in the figure, so the normal component of the field is constant across the curved surface and vanishes across the flat ends. Evaluating the flux integral gives the result reported in the key. Check every sign convention, unit and limiting case before selecting the final option. '

function optionText(index) {
  return [
    'The potential difference across the resistor is 6 V.',
    'The current through the branch is 2 A.',
    'The power dissipated in the circuit is 24 W.',
    'A very long alternative answer that must wrap cleanly without clipping the question block or the option column.',
  ][index % 4]
}

/** Three-subject JEE fixture with every figure attachment shape. */
export function buildFigureExamFixture() {
  const questions = [
    {
      q: 'Q1', subject: 'Physics', chapter: 'Current Electricity', topic: 'Circuit analysis',
      difficulty: 'Medium', type: 'MCQ', status: 'Correct', marks: 4, time: 2.4,
      selected: 1, correctAnswer: 1,
      text: 'In the circuit shown, the equivalent resistance between A and B is:',
      imageUrl: FIGURES.circuit,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: LONG_EXPLANATION,
    },
    {
      q: 'Q2', subject: 'Physics', chapter: 'Electrostatics', topic: 'Gauss law',
      difficulty: 'Hard', type: 'MCQ', status: 'Incorrect', marks: -1, time: 4.8,
      selected: 2, correctAnswer: 0,
      text: 'Two statements are made about the field lines in the figure. Choose the correct option.',
      stemImageUrls: [FIGURES.circuitDiagram, FIGURES.embedded],
      options: [
        { key: 'a', text: 'Only statement I is correct.', imageUrl: FIGURES.mathOption1 },
        { key: 'b', text: 'Only statement II is correct.', imageUrl: FIGURES.mathOption2 },
        { key: 'c', text: 'Both statements are correct.', imageUrl: FIGURES.mathOption3 },
        { key: 'd', text: 'Neither statement is correct.', imageUrl: FIGURES.mathOption4 },
      ],
      explanation: 'Compare the flux through the two surfaces shown. ![flux surfaces](' + FIGURES.circuitDiagram + ') ' + LONG_EXPLANATION,
      mistakeCategory: 'Concept Error', mistakeHint: 'The field inside a conductor is zero in electrostatic equilibrium.',
    },
    {
      q: 'Q3', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Moment of inertia',
      difficulty: 'Easy', type: 'MCQ', status: 'Skipped', marks: 0, time: 1.1,
      selected: null, correctAnswer: 3,
      text: 'The moment of inertia of the rigid body shown about the axis is:',
      stemImageUrl: `${FIGURES.geometry}|${FIGURES.mechanics}`,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Use the parallel-axis theorem. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q4', subject: 'Physics', chapter: 'Modern Physics', topic: 'Photoelectric effect',
      difficulty: 'Medium', type: 'MCQ', status: 'Correct', marks: 4, time: 5.2,
      selected: 0, correctAnswer: 0,
      text: 'The graph in the figure plots stopping potential against frequency. Identify the correct interpretation.',
      imageUrl: FIGURES.webp,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'The slope of the graph is h/e. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q5', subject: 'Physics', chapter: 'Optics', topic: 'Ray optics',
      difficulty: 'Hard', type: 'MCQ', status: 'Incorrect', marks: -1, time: 3.3,
      selected: 1, correctAnswer: 2,
      text: 'The ray diagram in the figure shows a lens combination. The final image is:',
      imageUrl: FIGURES.avif,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Apply the lens formula twice. ' + LONG_EXPLANATION,
      explanationImageUrls: [FIGURES.circuit],
    },
    {
      q: 'Q6', subject: 'Physics', chapter: 'Kinematics', topic: 'Relative motion',
      difficulty: 'Easy', type: 'MCQ', status: 'Correct', marks: 4, time: 1.7,
      selected: 3, correctAnswer: 3,
      text: 'A particle moves with the velocity-time graph shown. The displacement in 4 s is:',
      figureUrl: FIGURES.geometry,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Area under the graph. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q7', subject: 'Physics', chapter: 'Properties of Matter', topic: 'Elasticity',
      difficulty: 'Medium', type: 'MCQ', status: 'Incorrect', marks: -1, time: 2.9,
      selected: 0, correctAnswer: 1,
      text: 'The stress-strain curve for the material is shown. Which region represents elastic behaviour?',
      imageUrl: FIGURES.missing,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'The elastic region ends at the yield point.',
    },
    {
      q: 'Q8', subject: 'Physics', chapter: 'Thermodynamics', topic: 'First law',
      difficulty: 'Medium', type: 'MCQ', status: 'Correct', marks: 4, time: 3.9,
      selected: 2, correctAnswer: 2,
      text: 'The indicator diagram in the figure represents a cyclic process. The net work done is:',
      images: [{ url: FIGURES.circuit, alt: 'indicator diagram' }],
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Net work is the enclosed area. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q9', subject: 'Physics', chapter: 'Waves', topic: 'Standing waves',
      difficulty: 'Easy', type: 'MCQ', status: 'Correct', marks: 4, time: 1.4,
      selected: 1, correctAnswer: 1,
      text: 'The standing wave pattern shown corresponds to which harmonic?',
      imageUrl: INLINE_PNG,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Count the nodes and antinodes.',
    },
    {
      q: 'Q10', subject: 'Chemistry', chapter: 'Chemical Bonding', topic: 'Molecular geometry',
      difficulty: 'Medium', type: 'MCQ', status: 'Incorrect', marks: -1, time: 3.6,
      selected: 0, correctAnswer: 3,
      text: 'The molecular structure shown belongs to which geometry?',
      imageUrl: FIGURES.chemistry,
      options: [
        { key: 'a', text: '', imageUrl: FIGURES.chemistryOptionA },
        { key: 'b', text: '', imageUrl: FIGURES.chemistryOptionB },
        { key: 'c', text: '', imageUrl: FIGURES.chemistryOptionC },
        { key: 'd', text: '', imageUrl: FIGURES.chemistryOptionD },
      ],
      explanation: 'Count the electron domains around the central atom. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q11', subject: 'Chemistry', chapter: 'Organic Chemistry', topic: 'Reaction mechanism',
      difficulty: 'Hard', type: 'MCQ', status: 'Incorrect', marks: -1, time: 6.1,
      selected: 3, correctAnswer: 1,
      text: 'The reaction scheme shown proceeds through which intermediate?',
      stemImageUrls: [FIGURES.chemistry],
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'The leaving group departs first, giving a planar carbocation. ' + LONG_EXPLANATION,
      mistakeCategory: 'Formula Error',
    },
    {
      q: 'Q12', subject: 'Chemistry', chapter: 'Electrochemistry', topic: 'Cell potential',
      difficulty: 'Medium', type: 'Numerical', status: 'Correct', marks: 4, time: 2.2,
      selected: 2, correctAnswer: 2,
      text: 'Using the standard potentials in the table shown, the cell potential is:',
      imageUrl: FIGURES.chemistry,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'E_cell = E_cathode - E_anode.',
    },
    {
      q: 'Q13', subject: 'Chemistry', chapter: 'Thermodynamics', topic: 'Enthalpy',
      difficulty: 'Easy', type: 'MCQ', status: 'Correct', marks: 4, time: 1.9,
      selected: 1, correctAnswer: 1,
      text: 'No figure is attached to this question; it tests the calculation described above.',
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Use Hess law.',
    },
    {
      q: 'Q14', subject: 'Mathematics', chapter: 'Calculus', topic: 'Definite integration',
      difficulty: 'Hard', type: 'MCQ', status: 'Skipped', marks: 0, time: 0,
      selected: null, correctAnswer: 0,
      text: 'Evaluate the definite integral whose region is shaded in the graph.',
      imageUrl: FIGURES.geometry,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'The region is symmetric about the y-axis. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q15', subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Conic sections',
      difficulty: 'Medium', type: 'MCQ', status: 'Correct', marks: 4, time: 4.4,
      selected: 0, correctAnswer: 0,
      text: 'The curve in the figure has eccentricity:',
      figureUrls: [FIGURES.geometry],
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Compare with the standard form. ' + LONG_EXPLANATION,
      explanation: 'Compare with the standard form and identify a and b. ' + LONG_EXPLANATION,
    },
    {
      q: 'Q16', subject: 'Mathematics', chapter: 'Algebra', topic: 'Matrices',
      difficulty: 'Medium', type: 'MCQ', status: 'Incorrect', marks: -1, time: 3.1,
      selected: 2, correctAnswer: 1,
      text: 'The transformation shown in the figure maps the unit square to:',
      imageUrl: `${FIGURES.geometry}?v=2`,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Apply the matrix to the basis vectors.',
    },
    {
      q: 'Q17', subject: 'Mathematics', chapter: 'Vectors', topic: 'Dot product',
      difficulty: 'Easy', type: 'MCQ', status: 'Correct', marks: 4, time: 2.0,
      selected: 3, correctAnswer: 3,
      text: 'The angle between the vectors represented in the figure is:',
      imageUrl: FIGURES.embedded,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Use the dot-product definition.',
    },
    {
      q: 'Q18', subject: 'Mathematics', chapter: 'Probability', topic: 'Bayes theorem',
      difficulty: 'Hard', type: 'MCQ', status: 'Incorrect', marks: -1, time: 5.8,
      selected: 0, correctAnswer: 2,
      text: 'The tree diagram in the figure summarises the experiment. The required probability is:',
      imageUrl: FIGURES.circuit,
      options: [optionText(0), optionText(1), optionText(2), optionText(3)],
      explanation: 'Apply Bayes theorem with the prior probabilities from the tree.',
    },
  ]

  return {
    meta: {
      examId: 'REF-JEE-FIG-2026-01',
      examName: 'JEE Main Figure Validation Paper',
      course: 'JEE Main 2027 · Full Syllabus',
      pattern: 'JEE Main (Paper 1)',
      student: 'Aarav Sharma', rollNo: '21CS114', date: '2026-08-01',
      totalMarks: 72, duration: '3 hrs',
      sections: ['Physics', 'Chemistry', 'Mathematics'], examStatus: 'Completed',
    },
    hero: {
      score: 41, maxScore: 72, percentage: 56.9, grade: 'B', rank: 2480, percentile: 87.4,
      batchRank: 12, cohortSize: 180, overallAccuracy: 63.4, overallSpeed: 3.2,
      confidenceIndex: 71, readinessScore: 66, healthScore: 74, badge: 'Figure QA',
      aiSummary: 'Figure-rich validation payload: every question figure, option figure and explanation figure must appear in the PDF against its own question.',
    },
    questionIntelligence: {
      total: 18, attempted: 15, correct: 8, incorrect: 7, skipped: 3,
      successRate: 53.3, accuracy: 53.3, negativeMarks: 7, guessAttempts: 1, attemptRatio: 83.3,
    },
    attempt: { elapsedSeconds: 6420 },
    subjects: [
      { name: 'Physics', score: 19, maxMarks: 36, accuracy: 55.6, time: 38, rank: 2, difficulty: 'Medium', attempted: 9, correct: 5, weakAreas: ['Ray optics'], strongAreas: ['Circuits'] },
      { name: 'Chemistry', score: 14, maxMarks: 24, accuracy: 50, time: 26, rank: 4, difficulty: 'Hard', attempted: 4, correct: 2, weakAreas: ['Bonding'], strongAreas: ['Thermodynamics'] },
      { name: 'Mathematics', score: 8, maxMarks: 12, accuracy: 40, time: 30, rank: 6, difficulty: 'Hard', attempted: 3, correct: 1, weakAreas: ['Probability'], strongAreas: ['Vectors'] },
    ],
    chapters: [
      { chapter: 'Current Electricity', subject: 'Physics', accuracy: 74, marks: 8, time: 9, attempted: 100, mastery: 'Average', questions: 1 },
      { chapter: 'Electrostatics', subject: 'Physics', accuracy: 41, marks: 4, time: 11, attempted: 100, mastery: 'Weak', questions: 1 },
      { chapter: 'Rotational Motion', subject: 'Physics', accuracy: 100, marks: 4, time: 6, attempted: 100, mastery: 'Strong', questions: 1 },
      { chapter: 'Chemical Bonding', subject: 'Chemistry', accuracy: 38, marks: 4, time: 8, attempted: 100, mastery: 'Critical', questions: 1 },
      { chapter: 'Organic Chemistry', subject: 'Chemistry', accuracy: 44, marks: 4, time: 10, attempted: 100, mastery: 'Weak', questions: 1 },
      { chapter: 'Calculus', subject: 'Mathematics', accuracy: 100, marks: 4, time: 4, attempted: 100, mastery: 'Strong', questions: 1 },
      { chapter: 'Probability', subject: 'Mathematics', accuracy: 32, marks: 4, time: 7, attempted: 100, mastery: 'Critical', questions: 1 },
    ],
    topics: [
      { topic: 'Circuit analysis', subject: 'Physics', mastery: 74, level: 'Average' },
      { topic: 'Gauss law', subject: 'Physics', mastery: 41, level: 'Weak' },
      { topic: 'Molecular geometry', subject: 'Chemistry', mastery: 38, level: 'Critical' },
      { topic: 'Reaction mechanism', subject: 'Chemistry', mastery: 44, level: 'Weak' },
      { topic: 'Definite integration', subject: 'Mathematics', mastery: 68, level: 'Average' },
      { topic: 'Bayes theorem', subject: 'Mathematics', mastery: 32, level: 'Critical' },
    ],
    mistakes: [
      { category: 'Concept Error', count: 3 }, { category: 'Formula Error', count: 2 },
      { category: 'Calculation Error', count: 2 },
    ],
    mistakeList: [
      { q: 'Q2', subject: 'Physics', category: 'Concept Error', topic: 'Gauss law', detail: 'Assumed the field inside a conductor is non-zero.' },
      { q: 'Q10', subject: 'Chemistry', category: 'Concept Error', topic: 'Molecular geometry', detail: 'Counted bonds instead of electron domains.' },
      { q: 'Q18', subject: 'Mathematics', category: 'Formula Error', topic: 'Bayes theorem', detail: 'Inverted the conditional probabilities.' },
    ],
    difficulty: [
      { level: 'Easy', questions: 5, accuracy: 80, attempted: 5, time: 2.1 },
      { level: 'Medium', questions: 8, accuracy: 50, attempted: 7, time: 3.1 },
      { level: 'Hard', questions: 5, accuracy: 33, attempted: 3, time: 4.9 },
    ],
    timeIntelligence: {
      avgTimePerQuestion: 3.2, fastestQuestion: { q: 'Q3', time: 1.1 }, slowestQuestion: { q: 'Q11', time: 6.1 },
      navigationCount: 4, timeManagementScore: 62,
      distribution: [
        { section: 'Physics', allocated: 180, used: 38, efficiency: 21 },
        { section: 'Chemistry', allocated: 180, used: 26, efficiency: 14 },
        { section: 'Mathematics', allocated: 180, used: 30, efficiency: 17 },
      ],
    },
    comparison: {
      previousTest: { label: 'Previous test', score: 38, percentile: 84.2, grade: 'B' },
      batchAverage: { label: 'Batch average', score: 39, percentile: 62.1, name: 'Batch A' },
      deltas: [{ label: 'vs previous test', value: '+3', up: true }],
    },
    predictions: {},
    prediction: {
      jeePercentile: 92.4, neetScore: null, expectedAIR: 9800, riskLevel: 'Medium',
      expectedImprovement: '+4.0%', targetProbability: 64,
      trajectory: [{ exam: 'Mock 1', score: 34 }, { exam: 'Figure validation', score: 41 }],
    },
    recommendations: {
      weakChapters: ['Gauss law', 'Molecular geometry', 'Bayes theorem'],
      weakTopics: ['Gauss law', 'Molecular geometry', 'Bayes theorem'],
      priorityRevision: [
        { topic: 'Gauss law — closed surface choice', priority: 'Critical', timeframe: '48 hours' },
        { topic: 'Molecular geometry — VSEPR domains', priority: 'High', timeframe: '5 days' },
        { topic: 'Bayes theorem — conditional inversion', priority: 'Medium', timeframe: '7 days' },
      ],
      suggestedPYQs: [{ title: 'JEE 2024 · Electrostatics', source: 'Previous year paper' }],
      practiceQuestions: [{ title: 'Circuit analysis drill', count: 10, difficulty: 'Medium' }],
      mockTests: [{ title: 'Full syllabus mock 4', mode: 'Timed' }],
      lectures: [{ title: 'VSEPR geometry walkthrough', type: 'Video' }],
    },
    questionReview: questions,
  }
}

/** Layer representative figures onto an existing analysis payload. */
export function withFigures(data, { every = 3, limit = 40 } = {}) {
  const pool = [
    { imageUrl: FIGURES.circuit },
    { stemImageUrls: [FIGURES.circuitDiagram, FIGURES.embedded] },
    { imageUrl: FIGURES.chemistry },
    { imageUrl: FIGURES.geometry },
    { imageUrl: FIGURES.webp },
    { imageUrl: FIGURES.avif },
    { figureUrl: FIGURES.mathOption1 },
    { imageUrl: FIGURES.missing },
  ]
  const rows = (data.questionReview || []).map((row, index) => {
    if (index >= limit || index % every !== 0) return row
    const attachment = pool[(index / every) % pool.length]
    const withOptionImages = index % (every * 2) === 0
    return {
      ...row,
      ...attachment,
      options: withOptionImages
        ? [
          { key: 'a', text: optionText(0), imageUrl: FIGURES.mathOption1 },
          { key: 'b', text: optionText(1), imageUrl: FIGURES.mathOption2 },
          { key: 'c', text: optionText(2), imageUrl: FIGURES.mathOption3 },
          { key: 'd', text: optionText(3), imageUrl: FIGURES.mathOption4 },
        ]
        : row.options,
    }
  })
  return { ...data, questionReview: rows }
}

export default { buildFigureExamFixture, withFigures, FIGURES }
