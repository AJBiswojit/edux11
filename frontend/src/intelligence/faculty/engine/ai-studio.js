/**
 * Faculty Intelligence Engine — AI Teaching Studio (pure functions).
 * Assistant context & prompts, contextual recommendations, deterministic
 * mock-AI generators for lesson plans, teaching content and evaluation
 * reports, plus the teaching history and faculty portfolio.
 *
 * Generators are deterministic: same config + foundation → same output.
 * Wherever possible, generated items pull REAL content from the foundation
 * (question bank texts, weak topics, course outcomes).
 */

import { avg } from './scores.js'

const COURSE_TITLES = {
  CS501: 'Data Structures & Algorithms', CS502: 'Database Management Systems',
  CS503: 'Operating Systems', CS504: 'Computer Networks',
  CS505: 'Machine Learning', CS506: 'Theory of Computation',
}

/* ---------- AI Studio intelligence (assembled) ---------- */
export function computeAiStudioIntelligence({ derived, datasets, profile }) {
  const d = derived
  const ds = datasets

  const upcomingClasses = (d.dashboard?.todaySchedule ?? []).map((s) => ({
    course: s.course, subject: s.subject, section: s.section, time: s.time, room: s.room, status: s.teachingStatus,
  }))
  const upcomingAssessments = (d.assessment?.upcomingAssessments ?? []).slice(0, 4).map((a) => ({
    title: a.title, course: a.course, status: a.status, meta: a.meta,
  }))

  const assistantContext = {
    faculty: profile?.fullName ?? 'Dr. Meera Krishnan',
    courses: (d.courseProgress ?? []).map((c) => ({
      code: c.courseCode, title: c.title, students: c.students,
      progress: c.progress, avgScore: c.avgScore, passRate: c.passRate,
    })),
    teachingLoad: {
      sections: d.cohorts?.sections?.length ?? 0,
      students: d.cohorts?.totalStudents ?? 0,
      weeklyHours: ds.weeklyTeachingHours ?? 0,
    },
    weakChapters: (d.teachingInsights?.weakChapters ?? []).slice(0, 4).map((w) => w.chapter),
    weakStudents: (d.attentionStudents?.items ?? []).slice(0, 5).map((s) => s.name),
    upcomingClasses,
    upcomingAssessments,
    health: {
      teaching: d.teachingHealth?.score ?? 0,
      engagement: d.studentEngagement?.score ?? 0,
      assessment: d.assessment?.assessmentHealth?.score ?? 0,
    },
  }

  const recommendations = buildStudioRecommendations({ d, ds })

  const history = buildStudioHistory({ d, ds })

  const portfolio = buildPortfolio({ d, ds, profile })

  return {
    assistantContext,
    prompts: ds.assistantPrompts ?? [],
    recommendations,
    history,
    portfolio,
    savedLessonPlans: ds.savedLessonPlans ?? [],
    contentTypes: ds.contentStudioTypes ?? [],
    evaluationWorkflows: ds.evaluationWorkflows ?? [],
    resources: ds.studioResources ?? [],
    recentUploads: ds.studioRecentUploads ?? [],
  }
}

/* ---------- contextual recommendations ---------- */
function buildStudioRecommendations({ d, ds }) {
  const recs = []
  const weakest = d.assessment?.coverage?.weakest
  if (weakest) {
    recs.push({
      id: 'arec1', priority: 'High', icon: 'book', title: `Conduct revision for ${weakest.name}`,
      body: `${weakest.unit} has only ${weakest.coveragePct}% question coverage in ${weakest.course} — run a revision class and assign the unit's PYQ pack.`,
    })
  }
  const submission = d.assignmentCompletion?.overallSubmission ?? 100
  if (submission < 90) {
    recs.push({
      id: 'arec2', priority: 'Medium', icon: 'clipboard', title: 'Assignment completion is below target',
      body: `Cohort submission is at ${submission}% — a reminder push and 24h grace window typically recovers 15–20 points.`,
    })
  }
  const pyqGap = d.pyqIntelligence?.gapAnalysis?.find((g) => g.level !== 'Healthy')
  if (pyqGap) {
    recs.push({
      id: 'arec3', priority: 'Medium', icon: 'sparkles', title: 'Students need more PYQ practice',
      body: `${pyqGap.course} averages ${pyqGap.avgPyqPapers} PYQ papers per unit — schedule a timed PYQ session before the midsem.`,
    })
  }
  const arCount = (d.assessment?.questionStats?.typeDistribution ?? []).find((t) => t.type === 'Assertion Reason')?.count ?? 0
  if (arCount === 0) {
    recs.push({
      id: 'arec4', priority: 'Medium', icon: 'list', title: 'Generate additional assertion-reason questions',
      body: 'The bank has none — competitive papers carry them. Use the Content Studio to draft a batch now.',
    })
  }
  const lab = d.attendanceIntelligence?.byClass?.find((x) => x.course === 'CS501-LAB')
  if (lab && lab.weeksAvg < 90) {
    recs.push({
      id: 'arec5', priority: 'Medium', icon: 'flask', title: 'Prepare practical session before lab exam',
      body: `Lab attendance is ${lab.weeksAvg}% — publish the practical sheet and viva question list this week.`,
    })
  }
  return recs
}

/* ---------- teaching history (seed + derived events merged) ---------- */
function buildStudioHistory({ d, ds }) {
  const seed = (ds.aiStudioHistory ?? []).map((h) => ({ ...h }))
  const derivedEvents = (d.teachingTimeline?.events ?? [])
    .filter((e) => ['paper', 'quiz', 'exam', 'revision'].includes(e.type))
    .map((e) => ({
      id: `h_${e.id}`,
      type: e.type === 'paper' ? 'paper' : e.type === 'quiz' ? 'assessment' : e.type === 'exam' ? 'assessment' : 'revision',
      title: e.title,
      detail: e.description,
      date: e.date,
    }))
  return [...seed, ...derivedEvents]
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, 24)
}

/* ---------- faculty portfolio (dataset + live numbers) ---------- */
function buildPortfolio({ d, ds, profile }) {
  const fp = ds.facultyPortfolio ?? {}
  return {
    professional: {
      name: profile?.fullName ?? '—',
      facultyId: profile?.facultyId ?? '—',
      designation: profile?.designation ?? '—',
      department: profile?.department ?? '—',
      institution: profile?.institution ?? '—',
      qualification: profile?.qualification ?? '—',
      experienceYears: profile?.experienceYears ?? 0,
      email: profile?.email ?? '—',
      phone: profile?.phone ?? '—',
      officeHours: profile?.officeHours ?? '—',
      officeRoom: profile?.officeRoom ?? '—',
      specialization: profile?.specialization ?? [],
    },
    teachingStatistics: {
      totalStudentsTaught: profile?.teachingStatistics?.totalStudentsTaught ?? 0,
      cumulativeCourses: profile?.teachingStatistics?.cumulativeCourses ?? 0,
      avgClassAverage: profile?.teachingStatistics?.avgClassAverage ?? 0,
      avgPassRate: profile?.teachingStatistics?.avgPassRate ?? 0,
      publications: profile?.teachingStatistics?.publications ?? 0,
      hIndex: profile?.teachingStatistics?.hIndex ?? 0,
    },
    courses: (d.courseProgress ?? []).map((c) => ({
      code: c.courseCode, title: c.title, students: c.students,
      progress: c.progress, avgScore: c.avgScore,
    })),
    performance: {
      teachingHealth: d.teachingHealth?.score ?? 0,
      teachingGrade: d.teachingHealth?.grade ?? '—',
      effectiveness: d.teachingEffectiveness?.score ?? 0,
      engagement: d.studentEngagement?.score ?? 0,
      healthTrend: (d.performanceTrend?.classTrend ?? []).map((w) => ({ label: w.week, value: w.avg })),
    },
    achievements: fp.achievements ?? [],
    certifications: fp.certifications ?? [],
    publications: fp.publications ?? [],
    feedback: fp.feedbackSummary ?? {},
    goals: profile?.teachingGoals ?? [],
    advisorGroups: profile?.advisorGroups ?? [],
  }
}

/* ================================================================
 * Lesson plan generator — deterministic mock-AI
 * ================================================================ */
export function generateLessonPlan({ config, derived, datasets }) {
  const { course = 'CS501', subject, chapter = 'Graph Algorithms', learningOutcome = 'Apply core concepts to solve problems', duration = 50, method = 'Lecture + Practice', difficulty = 'Medium' } = config
  const d = derived ?? {}

  const courseRow = (d.courseProgress ?? []).find((c) => c.courseCode === course)
  const outcomes = courseRow?.outcomes ?? []
  const coLine = outcomes.length
    ? `Mapped to ${outcomes.map((o) => o.co).join(', ')}`
    : 'Mapped to course learning outcomes'

  const weak = (d.teachingInsights?.weakChapters ?? []).find((w) => w.chapter.toLowerCase().includes(chapter.split(' ')[0].toLowerCase()))
  const revisionNote = weak
    ? `Note: ${chapter} has a ${weak.gap}% gap flagged — keep examples concrete and re-test at the end.`
    : `No gap flagged for this chapter — extend with an enrichment problem.`

  const mins = Math.max(duration ?? 50, 20)
  const practiceMin = Math.max(6, Math.round(mins * 0.18))

  return {
    title: `${chapter} — ${method} (${duration} min)`,
    course,
    subject: subject ?? COURSE_TITLES[course] ?? course,
    chapter,
    learningOutcome,
    duration,
    method,
    difficulty,
    coLine,
    revisionNote,
    objectives: [
      `Explain the core ideas of ${chapter} in your own words`,
      `Apply ${chapter} techniques to a structured problem set`,
      `Analyze trade-offs and edge cases in ${chapter}`,
      `Connect ${chapter} to exam-style questions (PYQ × frequency noted)`,
    ],
    sections: [
      { title: 'Introduction & hook', minutes: Math.max(4, Math.round(mins * 0.12)), content: `Open with a relatable problem tied to ${chapter}. Ask 2 quick recall questions from last lecture to activate prior knowledge.` },
      { title: 'Teaching objectives', minutes: 2, content: `Share the 4 objectives above; highlight what success looks like by the end of the session.` },
      { title: 'Core explanation', minutes: Math.max(10, Math.round(mins * 0.28)), content: `Teach the key definitions and the worked method for ${chapter} using a small worked example. Difficulty target: ${difficulty}.` },
      { title: 'Worked examples', minutes: Math.max(8, Math.round(mins * 0.18)), content: `Two examples: (A) a textbook-style trace, (B) a slightly harder variant with a common misconception embedded for discussion.` },
      { title: 'Activities', minutes: Math.max(5, Math.round(mins * 0.12)), content: `Pair activity: students solve a mini-problem on ${chapter} and swap to peer-check. Provide a half-solved scaffold for weaker pairs.` },
      { title: 'Class discussion', minutes: Math.max(4, Math.round(mins * 0.1)), content: `Discussion prompts: "Where does the naive approach fail?", "How would you explain ${chapter} to a friend?", "Which exam question pattern fits this best?"` },
      { title: 'Practice', minutes: practiceMin, content: `Individual practice sheet (${practiceMin} min): 2 core + 1 challenge problem on ${chapter}. Answers revealed after the timer.` },
      { title: 'Homework', minutes: 0, content: `3 problems for submission: one direct, one applied, one exam-style from the PYQ bank. Include the rubric reference.` },
      { title: 'Revision & assessment', minutes: Math.max(3, Math.round(mins * 0.06)), content: `Exit ticket: 3 quick questions. ${revisionNote}` },
    ],
    generatedAt: new Date().toISOString(),
  }
}

/* ================================================================
 * Content Studio generator — deterministic mock-AI
 * ================================================================ */
export function generateStudioContent({ type = 'notes', config, derived, datasets }) {
  const { course = 'CS501', topic = 'Graph Algorithms', count = 10, difficulty = 'Medium' } = config
  const d = derived ?? {}
  const bankQuestions = (d.assessment?.questionStats?.questions ?? []).filter((q) => q.subject === course)

  const title = (name) => `${name} — ${topic} (${course})`

  switch (type) {
    case 'mcq': {
      const source = bankQuestions.filter((q) => q.type === 'MCQ').slice(0, count)
      const items = source.length
        ? source.map((q, i) => ({ no: i + 1, text: q.text, options: q.options?.length ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'], difficulty: q.difficulty, bloom: q.bloom }))
        : Array.from({ length: Math.min(count, 10) }, (_, i) => ({
            no: i + 1,
            text: `Which statement best describes a core property of ${topic}? (variant ${i + 1})`,
            options: ['Option A — correct', 'Option B', 'Option C', 'Option D'],
            difficulty: i % 3 === 0 ? 'Hard' : 'Medium',
            bloom: ['Remember', 'Understand', 'Apply', 'Analyze'][i % 4],
          }))
      return { id: `mcq_${Date.now()}`, type, title: title('MCQs'), count: items.length, items, difficulty, meta: `${items.length} questions · answer key included · ${difficulty}` }
    }
    case 'theory': {
      const weak = d.teachingInsights?.weakTopics?.[0]?.topic ?? topic
      return {
        id: `theory_${Date.now()}`, type, title: title('Theory Questions'), count: 6, difficulty,
        items: [
          { no: 1, text: `Explain the fundamental idea behind ${topic} with a labelled diagram.`, marks: 5, bloom: 'Understand' },
          { no: 2, text: `Trace ${topic} on the given input and show all intermediate states.`, marks: 8, bloom: 'Apply' },
          { no: 3, text: `Compare two approaches for ${topic} — state when each wins.`, marks: 6, bloom: 'Analyze' },
          { no: 4, text: `Design a variant of ${topic} for the described constraint and justify it.`, marks: 10, bloom: 'Create' },
          { no: 5, text: `Discuss the common pitfalls students face in ${topic} (reference: ${weak}).`, marks: 4, bloom: 'Evaluate' },
          { no: 6, text: `Solve the exam-style problem on ${topic} from the PYQ bank (2023).`, marks: 8, bloom: 'Apply' },
        ],
        meta: '6 questions · Apply/Analyze heavy · marks included',
      }
    }
    case 'notes':
      return {
        id: `notes_${Date.now()}`, type, title: title('Lecture Notes'), count: 6, difficulty,
        sections: [
          { heading: '1 · Big idea', content: `The central question of ${topic} and why it matters for ${COURSE_TITLES[course] ?? course}.` },
          { heading: '2 · Definitions', content: `Key terms for ${topic} with one-line formal definitions and intuitive glosses.` },
          { heading: '3 · Core algorithm / method', content: `Step-by-step procedure for ${topic}, with a running example.` },
          { heading: '4 · Worked example', content: `A complete solved example from the question bank (see MCQs on ${topic}).` },
          { heading: '5 · Common pitfalls', content: `The 3 most common mistakes students make in ${topic} — with the fix for each.` },
          { heading: '6 · Exam pointers', content: `How ${topic} appears in PYQs: frequency, pattern and marks distribution.` },
        ],
        meta: '6 sections · exam-aligned · includes PYQ pointers',
      }
    case 'presentation':
      return {
        id: `pres_${Date.now()}`, type, title: title('Presentation Outline'), count: 12, difficulty,
        slides: [
          { slide: 1, title: `Title — ${topic}`, points: ['Course + topic', 'Duration & objectives'] },
          { slide: 2, title: 'Agenda', points: ['Motivation', 'Concepts', 'Examples', 'Practice'] },
          { slide: 3, title: 'Why this matters', points: [`Real-world use of ${topic}`, 'Exam weightage'] },
          { slide: 4, title: 'Core definitions', points: ['Term 1 · Term 2 · Term 3'] },
          { slide: 5, title: 'The method', points: ['Step 1–4 with a mini-diagram'] },
          { slide: 6, title: 'Example A', points: ['Walkthrough', 'Common misconception'] },
          { slide: 7, title: 'Example B', points: ['Harder variant', 'Think-pair-share'] },
          { slide: 8, title: 'Discussion', points: ['2 discussion prompts'] },
          { slide: 9, title: 'Practice set', points: ['2 core + 1 challenge'] },
          { slide: 10, title: 'PYQ spotlight', points: ['Recent exam question on this topic'] },
          { slide: 11, title: 'Summary', points: ['3 takeaways'] },
          { slide: 12, title: 'Exit ticket', points: ['3 quick questions'] },
        ],
        meta: '12 slides · talking points included',
      }
    case 'assignment':
      return {
        id: `asg_${Date.now()}`, type, title: title('Assignments'), count: 5, difficulty,
        items: [
          { no: 1, text: `Solve problem set A on ${topic} (direct application).`, marks: 3 },
          { no: 2, text: `Solve problem set B — identify the trap variant.`, marks: 4 },
          { no: 3, text: `Compare two solution strategies for ${topic} with complexity analysis.`, marks: 5 },
          { no: 4, text: `Implement ${topic} in your chosen language with 3 test cases.`, marks: 5 },
          { no: 5, text: `Exam-style: answer the 2023 PYQ on ${topic}.`, marks: 3 },
        ],
        meta: '5 problems · 20 marks · rubric attached',
      }
    case 'revision':
      return {
        id: `rev_${Date.now()}`, type, title: title('Revision Notes'), count: 1, difficulty,
        sections: [
          { heading: 'Key definitions', content: `Compact definitions for ${topic}.` },
          { heading: 'Method in 4 steps', content: `The essential procedure, numbered.` },
          { heading: 'Formula / fact box', content: `Critical formulas and theorems for ${topic}.` },
          { heading: 'PYQ frequency', content: `How often each sub-topic appears (from your PYQ intelligence).` },
          { heading: 'Top 5 exam questions', content: `Highest-yield questions with short answers.` },
        ],
        meta: 'One-page revision sheet · exam-first',
      }
    case 'formula':
      return {
        id: `form_${Date.now()}`, type, title: title('Formula Sheet'), count: 1, difficulty,
        items: [
          { no: 1, label: 'Key formula 1', text: `Definition/equation for ${topic} core result.` },
          { no: 2, label: 'Key formula 2', text: `Complexity result with conditions.` },
          { no: 3, label: 'Key formula 3', text: `Theorem statement in one line.` },
          { no: 4, label: 'Key fact', text: `Exam-favourite fact about ${topic}.` },
        ],
        meta: 'Formula sheet · A4 · print-ready',
      }
    case 'lab':
      return {
        id: `lab_${Date.now()}`, type, title: title('Lab Exercises'), count: 3, difficulty,
        items: [
          { no: 1, text: `Implement the basic ${topic} routine with input validation.`, tests: ['Test 1: empty input', 'Test 2: single element', 'Test 3: boundary case'] },
          { no: 2, text: `Extend with the variant discussed in class (${topic} + optimization).`, tests: ['Test: known answer', 'Test: large input performance'] },
          { no: 3, text: `Contest-style: solve the judge problem on ${topic} within the time limit.`, tests: ['Judge sample + hidden'] },
        ],
        meta: '3 exercises · test cases included · record template ref.',
      }
    case 'rubric':
      return {
        id: `rub_${Date.now()}`, type, title: title('Rubric'), count: 1, difficulty,
        items: [
          { band: 'Exceeds (90–100)', text: `Correct approach, optimal complexity, full documentation.` },
          { band: 'Meets (70–89)', text: `Correct with minor slips; complexity discussed.` },
          { band: 'Developing (50–69)', text: `Partially correct; key steps missing.` },
          { band: 'Beginning (<50)', text: `Incorrect or incomplete; needs rework.` },
        ],
        meta: '4 bands · criteria: correctness, complexity, clarity',
      }
    case 'quick':
      return {
        id: `quick_${Date.now()}`, type, title: title('Quick Revision'), count: 15, difficulty,
        items: Array.from({ length: 15 }, (_, i) => ({ no: i + 1, fact: `Rapid-fire fact ${i + 1} about ${topic} — one line, exam-ready.` })),
        meta: '15 rapid-fire facts · last-minute prep',
      }
    case 'mindmap':
      return {
        id: `mm_${Date.now()}`, type, title: title('Mind Map (Prototype)'), count: 1, difficulty,
        nodes: [
          { center: topic, branches: ['Concepts', 'Methods', 'Examples', 'Pitfalls', 'Exam links'] },
        ],
        meta: 'Prototype mind map — visual version ships with the export',
      }
    case 'case':
    case 'scenario':
      return {
        id: `${type}_${Date.now()}`, type, title: title(type === 'case' ? 'Case Studies' : 'Scenario Questions'), count: type === 'case' ? 2 : 5, difficulty,
        items: Array.from({ length: type === 'case' ? 2 : 5 }, (_, i) => ({
          no: i + 1,
          scenario: `Scenario ${i + 1}: a real-world situation where ${topic} applies.`,
          questions: ['Identify the problem', 'Propose an approach', 'Discuss trade-offs', 'Recommend a solution'],
        })),
        meta: type === 'case' ? '2 case studies · guided questions' : '5 scenarios · problem-solving practice',
      }
    case 'practical':
    default:
      return {
        id: `${type}_${Date.now()}`, type, title: title('Practical Sheet'), count: 1, difficulty,
        sections: [
          { heading: 'Aim', content: `Practice ${topic} hands-on.` },
          { heading: 'Apparatus', content: 'Workstation, compiler/IDE, record book.' },
          { heading: 'Procedure', content: `Step-by-step instructions for ${topic}.` },
          { heading: 'Observations', content: 'Table template + output capture.' },
          { heading: 'Conclusion', content: 'What was verified and one insight.' },
        ],
        meta: 'Practical sheet · observation table included',
      }
  }
}

/* ================================================================
 * Evaluation generator — deterministic mock-AI
 * ================================================================ */
export function generateEvaluation({ type = 'assignment', config, derived, datasets }) {
  const { course = 'CS501', batch = 'Sec A · B · C', submissions = 42 } = config
  const d = derived ?? {}
  const workflow = (datasets?.evaluationWorkflows ?? []).find((w) => w.id === type) ?? datasets?.evaluationWorkflows?.[0]

  const assignment = (d.assignmentAnalytics?.items ?? []).find((a) => a.course === course)
  const performance = {
    submissions,
    graded: Math.round(submissions * 0.9),
    avgMarks: assignment?.avgPct ?? d.assignmentCompletion?.overallSubmission ?? 74,
    failureRate: assignment?.failureRate ?? 8,
    commonMistakes: assignment?.commonMistakes ?? workflow?.mistakes ?? [],
  }

  const feedbackDraft = `Well-structured attempt overall. ${performance.commonMistakes[0] ? `Watch out for ${performance.commonMistakes[0].toLowerCase()} — revise the worked example from class.` : ''} Your approach is on track; tighten the complexity analysis and add edge cases before the next submission. Keep it up!`

  return {
    id: `eval_${Date.now()}`,
    type,
    workflowName: workflow?.name ?? 'Evaluation',
    course,
    batch,
    generatedAt: new Date().toISOString(),
    aiSuggestions: [
      `Auto-flagged ${Math.max(1, Math.round(submissions * 0.05))} submissions for similarity — review before releasing marks.`,
      performance.avgMarks < 75 ? `Cohort average ${performance.avgMarks}% — schedule a doubt session on the weakest sub-topic.` : `Cohort average ${performance.avgMarks}% — healthy; push the top band with the enrichment problem.`,
      `AI pre-drafted comments for ${performance.graded} submissions — approve in batches of 10.`,
    ],
    rubric: (workflow?.rubric ?? []).map((criterion) => ({ criterion, checked: true })),
    commonMistakes: performance.commonMistakes.slice(0, 4),
    performanceSummary: {
      submissions: performance.submissions,
      graded: performance.graded,
      avgMarks: performance.avgMarks,
      failureRate: performance.failureRate,
      topBand: Math.round(performance.submissions * 0.22),
    },
    feedbackDraft,
  }
}

export default computeAiStudioIntelligence
