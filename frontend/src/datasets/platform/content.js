/**
 * Landing-page content: navigation, features, journeys, testimonials,
 * logos, pricing, FAQs, blog, careers, case studies and metrics.
 */

export const NAV_LINKS = [
  { label: 'Platform', href: '#platform', mega: true },
  { label: 'AI Suite', href: '#ai', mega: true },
  { label: 'For Institutions', href: '#journeys', mega: false },
  { label: 'Pricing', href: '#pricing', mega: false },
  { label: 'Resources', href: '#resources', mega: true },
]

/* Platform mega menu — every item maps to an ACTIVELY IMPLEMENTED capability
   (Phase 33 product alignment). Removed: Coding Lab (no active surface),
   Research Console (faculty research removed from the active UX), Parent
   Connect (parent portal disabled). Renamed to the product's own terms:
   Exam Builder → AI Question Paper Generator · Analytics Cloud →
   Institution Intelligence. Destinations point to real routes or the
   relevant landing sections — no dead marketing links. */
export const MEGA_MENU_PLATFORM = [
  {
    title: 'Learning',
    links: [
      { label: 'AI Academic Intelligence', desc: 'Understand student performance, strengths and learning patterns', icon: 'BrainCircuit', to: '/student/performance-accuracy' },
      { label: 'MediXO Mentor', desc: '24×7 conversational academic support', icon: 'Bot', to: '/student/mentor' },
      { label: 'AI Academic DNA', desc: 'Discover academic strengths, weaknesses and improvement areas', icon: 'Dna', to: '/student/performance-accuracy?tab=dna' },
      { label: 'AI Personalized Learning', desc: 'Build smarter learning journeys for every student', icon: 'Route', to: '/student/learning-path' },
    ],
  },
  {
    title: 'Assessment',
    links: [
      { label: 'Smart Assessments', desc: 'AI-powered assessment and performance intelligence', icon: 'ClipboardCheck', to: '/student/exam-agent' },
      { label: 'Question Bank', desc: 'Curriculum-aligned and reusable question intelligence', icon: 'Database', to: '/faculty/question-intelligence?tab=question-intelligence' },
      { label: 'PYQ Intelligence', desc: 'Analyze previous-year questions, patterns and topic trends', icon: 'Sparkles', to: '/faculty/question-intelligence?tab=pyq' },
      { label: 'AI Question Paper Generator', desc: 'Generate University, JEE and NEET papers in minutes', icon: 'FileSpreadsheet', to: '/faculty/question-intelligence?tab=paper-generator' },
    ],
  },
  {
    title: 'Institution',
    links: [
      { label: 'Exam command center', desc: 'Live JEE and NEET submissions across the institution', icon: 'BarChart3', to: '/admin' },
      { label: 'Students', desc: 'Student directory from live records', icon: 'Users', to: '/admin/students' },
      { label: 'Faculty', desc: 'Faculty directory from live records', icon: 'GraduationCap', to: '/admin/faculty' },
      { label: 'Batches', desc: 'JEE, NEET and university batches', icon: 'Users', to: '/admin/batches' },
    ],
  },
]

/* AI Suite — the platform's AI capabilities (separate menu, minimal overlap). */
export const MEGA_MENU_AI = [
  {
    title: 'AI for Students',
    links: [
      { label: 'AI Academic DNA', desc: 'Strengths, weaknesses and learning patterns', icon: 'Dna', to: '/student/performance-accuracy?tab=dna' },
      { label: 'AI Exam Intelligence', desc: 'Exam analysis, readiness and predictions', icon: 'BrainCircuit', to: '/student/exam-analysis' },
      { label: 'AI Career Readiness', desc: 'Career direction and portfolio intelligence', icon: 'Compass', to: '/student/portfolio' },
    ],
  },
  {
    title: 'AI for Faculty',
    links: [
      { label: 'AI Teaching Assistant', desc: 'Draft lessons, grade and analyse', icon: 'GraduationCap', to: '/faculty/ai-assistant' },
      { label: 'Assessment Intelligence', desc: 'Question, PYQ and paper intelligence', icon: 'Sparkles', to: '/faculty/question-intelligence' },
    ],
  },
  {
    title: 'AI for Institutions',
    links: [
      { label: 'Exam command center', desc: 'Live JEE and NEET submissions', icon: 'Bot', to: '/admin' },
    ],
  },
]

export const MEGA_MENU_RESOURCES = [
  {
    title: 'Learn',
    links: [
      { label: 'Blog', desc: 'Product, pedagogy and research', icon: 'Newspaper' },
      { label: 'Case Studies', desc: 'How institutions transform with MediXO EduX', icon: 'FileSearch' },
      { label: 'Help Centre', desc: 'Guides, FAQs and best practices', icon: 'LifeBuoy' },
      { label: 'Release Notes', desc: 'What’s new in MediXO EduX', icon: 'Rocket' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', desc: 'Our mission and team', icon: 'Heart' },
      { label: 'Careers', desc: 'Join a world-class team', icon: 'Briefcase' },
      { label: 'Media', desc: 'Press kit and announcements', icon: 'Camera' },
      { label: 'Contact', desc: 'Talk to our team', icon: 'Mail' },
    ],
  },
]

export const HERO_METRICS = [
  { value: 2.4, suffix: 'M+', decimals: 1, label: 'Learners worldwide' },
  { value: 850, suffix: '+', label: 'Institutions' },
  { value: 38, suffix: '%', label: 'Avg. grade improvement' },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Platform uptime' },
]

export const TRUSTED_BY = [
  'Institute of Technology',
  'Quantum University',
  'Stellar Public Schools',
  'Horizon Institute of Engineering',
  'Nexa Business School',
  'Orbit International Academy',
  'Pinnacle Group of Institutions',
  'Vertex College of Design',
]

export const FEATURES = [
  {
    icon: 'Sparkles',
    title: 'AI Tutor, available 24×7',
    desc: 'A conversational tutor that explains concepts step-by-step, adapts to each learner’s pace and never runs out of patience.',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: 'Route',
    title: 'Adaptive learning paths',
    desc: 'Every learner gets a path that re-routes itself based on mastery, effort and goals — not a one-size-fits-all syllabus.',
    gradient: 'from-blue-500 to-teal-400',
  },
  {
    icon: 'BarChart3',
    title: 'Institution analytics cloud',
    desc: 'Live dashboards for deans, HODs and teachers: retention, at-risk flags, outcomes and placement intelligence in one place.',
    gradient: 'from-teal-400 to-emerald-500',
  },
  {
    icon: 'ClipboardCheck',
    title: 'Auto-generated assessments',
    desc: 'Generate quizzes, assignments and full exam papers from a tagged question bank — with plagiarism and difficulty checks.',
    gradient: 'from-emerald-500 to-indigo-500',
  },
  {
    icon: 'HeartHandshake',
    title: 'Parent connect',
    desc: 'Parents see progress, attendance and insights in plain language — with AI-written summaries instead of jargon.',
    gradient: 'from-fuchsia-500 to-indigo-500',
  },
  {
    icon: 'ShieldCheck',
    title: 'Enterprise-grade trust',
    desc: 'SSO/SAML, role-based access, full audit trails, data residency and 99.9% uptime SLAs for institutions of every size.',
    gradient: 'from-slate-600 to-indigo-600',
  },
]

export const AI_CAPABILITIES = [
  { icon: 'MessageSquareText', title: 'Conversational Tutoring', desc: 'Socratic, step-by-step explanations with worked examples in any subject.', stat: '4.9/5 student rating' },
  { icon: 'BrainCircuit', title: 'Weakness Detection', desc: 'Continuous mastery modelling pinpoints exactly where a learner struggles.', stat: '2.1× faster concept mastery' },
  { icon: 'LineChart', title: 'Performance Prediction', desc: 'Early-warning models flag at-risk learners up to 8 weeks in advance.', stat: '92% prediction accuracy' },
  { icon: 'GraduationCap', title: 'AI Teaching Assistant', desc: 'Lesson drafts, auto-grading and class insights that save faculty 11 hrs/week.', stat: '11 hrs saved weekly' },
  { icon: 'FileSearch', title: 'GraphRAG Knowledge Search', desc: 'Semantic search across every lecture, note and paper — with cited answers.', stat: '10× faster research' },
  { icon: 'Briefcase', title: 'Career Intelligence', desc: 'Resume reviews, mock interviews and job matching tuned to each learner.', stat: '31% more offers' },
]

export const JOURNEYS = [
  {
    id: 'student',
    role: 'Student',
    tagline: 'Learn less. Master more.',
    color: '#6366f1',
    points: [
      { title: 'Personal AI study partner', desc: 'Ask anything, anytime. The AI tutor explains, quizzes and tracks your mastery.' },
      { title: 'Adaptive weekly plan', desc: 'Your study planner rebalances itself around exams, deadlines and weak topics.' },
      { title: 'Coding + career growth', desc: 'Practice in-browser, build a portfolio, and get coached for interviews.' },
    ],
  },
  {
    id: 'faculty',
    role: 'Faculty',
    tagline: 'Teach with superpowers.',
    color: '#14b8a6',
    points: [
      { title: 'AI teaching assistant', desc: 'Draft lesson plans, generate questions and auto-grade submissions.' },
      { title: 'Classroom intelligence', desc: 'Spot at-risk students early with live analytics across every cohort.' },
      { title: 'Research console', desc: 'Track citations, grants and collaborations in one workspace.' },
    ],
  },
  {
    id: 'admin',
    role: 'Administrator',
    tagline: 'Run the institution on data.',
    color: '#8b5cf6',
    points: [
      { title: 'Institution dashboard', desc: 'Enrolment, retention, outcomes and revenue — live and drillable.' },
      { title: 'Governance built-in', desc: 'Granular roles, permissions and a tamper-proof audit trail.' },
      { title: 'Placement intelligence', desc: 'Track drives, offers and CTC trends branch-by-branch.' },
    ],
  },
  {
    id: 'parent',
    role: 'Parent',
    tagline: 'Stay close, without hovering.',
    color: '#10b981',
    points: [
      { title: 'Plain-language insights', desc: 'AI summaries of progress, attendance and effort — no jargon.' },
      { title: 'Early alerts', desc: 'Gentle, timely notifications when support could help.' },
      { title: 'Direct teacher access', desc: 'Message teachers and book meetings in one tap.' },
    ],
  },
]

export const TESTIMONIALS = [
  {
    quote: 'MediXO EduX is the first platform that genuinely personalises learning at the pace of 12,480 students. Our pass rates are up 19% in two semesters.',
    name: 'Dr. Anil Menon',
    role: 'Vice Chancellor, Quantum University',
    initials: 'AM',
    rating: 5,
  },
  {
    quote: 'The AI teaching assistant pays for itself. My faculty reclaim 10+ hours a week that now goes into mentorship and research.',
    name: 'Dr. Meera Krishnan',
    role: 'HOD Computer Science, Institute of Technology',
    initials: 'MK',
    rating: 5,
  },
  {
    quote: 'We rolled MediXO EduX out across 14 campuses in 60 days. The analytics console alone changed how our board plans the year.',
    name: 'Sunil Kapoor',
    role: 'CEO, Pinnacle Group of Institutions',
    initials: 'SK',
    rating: 5,
  },
  {
    quote: 'My son’s teachers and I finally speak the same language. The AI insights tell me what to ask — and when to just cheer.',
    name: 'Rajesh Sharma',
    role: 'Parent, Institute of Technology',
    initials: 'RS',
    rating: 5,
  },
  {
    quote: 'The coding lab with instant feedback helped me clear three technical rounds at Google. MediXO Mentor felt like a senior who never sleeps.',
    name: 'Aarav Sharma',
    role: 'B.Tech CSE, Institute of Technology',
    initials: 'AS',
    rating: 5,
  },
  {
    quote: 'From syllabus mapping to exam blueprints, everything an accreditation audit needs is one export away. Extraordinary product discipline.',
    name: 'Prof. Elena Vasquez',
    role: 'Dean of Academics, Horizon Institute of Engineering',
    initials: 'EV',
    rating: 5,
  },
]

export const PRICING_PLANS = [
  {
    id: 'school',
    name: 'School',
    audience: 'K-12 schools & boards',
    monthly: 49,
    annual: 39,
    cta: 'Start with Schools',
    highlight: false,
    features: ['Up to 500 students', 'AI Tutor & Copilot', 'Attendance & report cards', 'Parent app with AI insights', '2 GB storage per school', 'Email support'],
  },
  {
    id: 'college',
    name: 'College & University',
    audience: 'Colleges, universities, IITs, NITs',
    monthly: 249,
    annual: 199,
    cta: 'Talk to Sales',
    highlight: true,
    features: ['Unlimited students & faculty', 'Full AI suite incl. coding lab', 'Institution analytics cloud', 'Placement & research consoles', 'Exam builder + question bank', 'SSO/SAML, LMS & ERP integrations', 'Dedicated success manager', '99.9% uptime SLA'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: 'EdTech, corporate academies, chains',
    monthly: null,
    annual: null,
    cta: 'Contact Us',
    highlight: false,
    features: ['Everything in University', 'Multi-tenant architecture', 'Custom AI model fine-tuning', 'On-premise / private cloud', 'Custom SLAs & support', 'Train-the-trainer programs'],
  },
]

export const FAQS = [
  { q: 'How long does it take to deploy MediXO EduX?', a: 'Most institutions go live in 2–6 weeks. Schools with under 2,000 students typically launch in under 10 days using our guided onboarding. University deployments with SSO and ERP integration average 4–6 weeks, with a dedicated implementation manager throughout.' },
  { q: 'Which boards, universities and curricula does MediXO EduX support?', a: 'MediXO EduX is curriculum-agnostic. We support CBSE, ICSE, State boards, autonomous universities, UGC/AICTE programs, and international curricula (IB, Cambridge, AP). Academic teams can map any syllabus into the platform in days.' },
  { q: 'How does the AI protect student data?', a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are GDPR and DPDP Act compliant, offer region-specific data residency, and never train shared models on your institution’s data. On-premise and private-cloud options are available for enterprises.' },
  { q: 'Can faculty control what the AI generates?', a: 'Completely. Faculty review and approve every AI-generated quiz, lesson or grade. Institutions can set model parameters, content guardrails and per-role permissions from the AI Configuration console.' },
  { q: 'Does MediXO EduX integrate with our existing LMS / ERP?', a: 'Yes. One-click integrations for Moodle, Canvas, Blackboard, Google Classroom, MS Teams, SAP, Tally and custom ERPs are available, plus REST APIs and webhooks for everything else.' },
  { q: 'What does the AI Tutor cost per student?', a: 'AI features are included in every plan with generous daily quotas. Institutions with heavy usage (e.g. 24×7 coaching programs) can choose usage-based AI add-ons starting at ₹39 per active student per month.' },
  { q: 'How is pricing structured for a multi-campus group?', a: 'Multi-campus groups get a single enterprise agreement with consolidated billing, a shared analytics cloud and per-campus role isolation. Our team will model a plan around your enrolment numbers.' },
  { q: 'Do you provide training for teachers and admins?', a: 'Every plan includes live onboarding for administrators. University and Enterprise plans add train-the-trainer workshops, certification for faculty champions and monthly best-practice webinars.' },
]

export const BLOG_POSTS = [
  {
    id: 1,
    slug: 'how-adaptive-learning-paths-are-changing-higher-education',
    title: 'How adaptive learning paths are quietly changing higher education',
    excerpt: 'Fixed syllabi are giving way to mastery-based paths that reshape themselves as a learner improves. Here is what 850 institutions have learned so far.',
    category: 'Pedagogy',
    author: 'Dr. Meera Krishnan',
    authorRole: 'Guest contributor',
    date: '2026-07-28',
    readTime: 7,
    cover: 'indigo',
    content: `# How adaptive learning paths are quietly changing higher education

For two decades, "personalised learning" meant a dashboard showing a student their own average. Adaptive paths are different: the *content itself* re-routes as mastery changes.

## What changes when the path adapts

1. **Pace becomes a feature, not a problem.** A learner who masters recursion in one sitting moves on; one who needs three passes gets worked examples instead of frustration.
2. **Effort becomes visible.** Institutions can finally see not just grades but *productive struggle* — where students persist, where they stall.
3. **Faculty time is reinvested.** When the machine handles practice and remediation, teachers spend their hours on mentorship and discussion.

## The evidence so far

Across 850+ institutions using MediXO EduX's path engine, the median effect is a 19% rise in course pass rates and a 2.1× reduction in time-to-mastery for core concepts. The biggest gains appear in exactly the cohorts that usually get left behind: first-generation learners and students balancing jobs.

## What to watch for

Adaptive systems are only as good as their feedback loops. The institutions seeing the strongest results share one habit: faculty review path-suggested interventions weekly, and the AI learns from those reviews.

*This article is part of MediXO EduX's open pedagogy series.*`,
  },
  {
    id: 2,
    slug: 'measuring-the-roi-of-ai-in-education',
    title: 'Measuring the ROI of AI in education: a CFO-friendly framework',
    excerpt: 'Adoption metrics are easy. Retention, outcomes and faculty-hours are harder. A practical framework for boards evaluating AI platforms.',
    category: 'Research',
    author: 'Ananya Iyer',
    authorRole: 'Director of Digital Learning',
    date: '2026-07-21',
    readTime: 9,
    cover: 'teal',
    content: `# Measuring the ROI of AI in education

Every board we meet asks the same question: what do we actually *get* for the AI budget? Here is the framework we use with partners.

## The four buckets

- **Retention economics** — each percentage point of retention improvement is worth lakhs in fees protected. Measure semester-over-semester dropout before and after launch.
- **Faculty productivity** — survey time spent on grading, question creation and reporting before and after. MediXO EduX institutions report 8–14 hours reclaimed weekly.
- **Outcome velocity** — pass rates, placement percentages and average CTC deltas, normalised against the cohort's entrance scores.
- **Administrative leverage** — hours saved in reporting and accreditation preparation, usually 30–60% reduction.

## A realistic first-year model

A 4,000-student university typically sees: 3–4 points of retention lift (₹1.2–2.4 Cr protected), 11 hours/week/faculty reclaimed (≈ ₹85L in equivalent time), and 6–9% placement improvement — against a subscription cost well under ₹50L.

## The discipline that makes it work

Name an owner for each metric before go-live. The institutions with named metric owners see 3× the ROI of those that don't.`,
  },
  {
    id: 3,
    slug: 'the-graphrag-breakthrough-institutional-knowledge-search',
    title: 'The GraphRAG breakthrough: search that actually understands your institution',
    excerpt: 'Keyword search returns documents. GraphRAG returns answers with the reasoning trail. How retrieval-augmented generation is changing research and revision.',
    category: 'AI',
    author: 'MediXO AI Team',
    authorRole: 'Platform Engineering',
    date: '2026-07-14',
    readTime: 6,
    cover: 'violet',
    content: `# The GraphRAG breakthrough

Ask a search box "what did Prof. Rao say about cache coherence in lecture 14?" and a keyword index fails you. GraphRAG — retrieval over a knowledge *graph* of concepts, lectures, notes and papers — answers with a synthesis and a trail of sources.

## Why graphs beat flat indexes for education

Educational content is relational: a lecture references a paper, a paper extends a textbook chapter, a student's doubt connects to three past exams. Flat vector search misses those edges; graph retrieval walks them.

## What learners and faculty actually do with it

- A student asks "connect graph traversal to how Google Maps works" — and receives a synthesis across three courses with cited sources.
- A researcher queries "attention mechanisms in vision transformers" and gets related papers, lab notes and prior student theses.
- A faculty member checks "what have we taught about NP-completeness across programs?" in seconds instead of days.

## Built for trust

Every answer cites its sources. Every citation is clickable. If the graph cannot support an answer, the system says so rather than hallucinate.`,
  },
  {
    id: 4,
    slug: 'parent-communication-without-the-hovering',
    title: 'Parent communication without the hovering: a design philosophy',
    excerpt: 'The best parent apps don’t notify more — they notify better. How AI-written insights turn anxious parents into informed partners.',
    category: 'Product',
    author: 'Riya Kapoor',
    authorRole: 'Head of Product',
    date: '2026-07-07',
    readTime: 5,
    cover: 'rose',
    content: `# Parent communication without the hovering

Early parent portals were firehoses: every mark, every absence, every event — 40 notifications a day. Parents muted them. Everyone lost.

## The principle: notify at the level of *support*, not surveillance

MediXO EduX's parent experience is built around three filters:

1. **Significance** — grade dips of consequence, attendance thresholds, upcoming major exams. Not every quiz.
2. **Actionability** — every alert carries a suggested next step: "ask about graph algorithms", "encourage sleep before Monday's test".
3. **Tone** — AI summaries in plain language, strengths first, concerns framed as opportunities.

## What parents tell us

"We no longer fight about marks — we talk about progress." That sentence, in different forms, appears in 71% of our parent surveys. Notifications per parent per week average 6 — and open rates are above 80%.

## A quiet win

The AI insight cards — monthly one-paragraph narratives of how a child learns — have become the most-shared feature of the platform. Families forward them to grandparents. That is the relationship we want to build.`,
  },
  {
    id: 5,
    slug: 'from-lecture-plans-to-exam-blueprints-in-minutes',
    title: 'From lecture plans to exam blueprints in minutes: faculty workflows rebuilt',
    excerpt: 'A typical faculty member spends 14 hours a week on preparation and grading. Here is how AI-assisted workflows compress that to 3.',
    category: 'Faculty',
    author: 'Dr. Vikram Rao',
    authorRole: 'Associate Professor, ECE',
    date: '2026-06-29',
    readTime: 6,
    cover: 'amber',
    content: `# From lecture plans to exam blueprints in minutes

When I started teaching in 2009, question papers took a weekend. The exam builder in MediXO EduX compresses the same job to under an hour — and the papers are better.

## The workflow

1. **Blueprints first.** Map the exam to course outcomes and weightages; the builder calculates coverage as you go.
2. **AI drafts, faculty curates.** The generator proposes questions from the tagged bank; I accept, edit or replace — every edit teaches the model my taste.
3. **Instant validation.** Difficulty balance, plagiarism checks, and outcome-coverage reports before printing.

## The honest caveats

The AI drafts a *first* version, never the final. Course outcomes that need higher-order thinking — design, evaluation — need deliberate faculty input. But the 60–70% of a paper that is routine? That time is back in my week.

## The compounding effect

Every exam I build makes the question bank smarter. By the end of a semester, the bank knows which questions discriminate between strong and weak learners — and flags them for reuse.`,
  },
  {
    id: 6,
    slug: 'medixo-launches-mentor-for-institutions',
    title: 'MediXO EduX launches Mentor for Institutions: AI that answers your board’s questions',
    excerpt: 'From "how is first-year retention trending?" to "which department needs support?" — institutional leaders get instant, cited answers.',
    category: 'Announcements',
    author: 'MediXO Team',
    authorRole: 'Product & Engineering',
    date: '2026-06-18',
    readTime: 4,
    cover: 'emerald',
    content: `# MediXO EduX launches Mentor for Institutions

Today we're shipping Copilot for Institutions — a conversational analytics layer that answers governance questions in plain language, with every number cited to the source dashboard.

## What it does

- "Show me first-year retention by department over three years" → a chart, a narrative, and drill-downs.
- "Which courses have the highest at-risk load this term?" → a ranked list with intervention-ready rosters.
- "Draft the academic quality section of our NAAC report" → a compliant first draft with gaps flagged.

## Why it matters

Leadership teams make decisions in meetings, not dashboards. Copilot puts the analytics *in* the conversation — and every claim traces back to the data pipeline, so governance quality improves instead of eroding.

Copilot for Institutions is available on University and Enterprise plans from today.`,
  },
]

export const CAREERS = [
  { id: 'c1', title: 'Senior Frontend Engineer', team: 'Platform', location: 'Bengaluru / Remote', type: 'Full-time', exp: '4–8 yrs', tags: ['React', 'Design Systems', 'Performance'] },
  { id: 'c2', title: 'Machine Learning Engineer — LLM', team: 'AI', location: 'Bengaluru', type: 'Full-time', exp: '3–7 yrs', tags: ['PyTorch', 'RAG', 'Evaluation'] },
  { id: 'c3', title: 'Product Designer', team: 'Design', location: 'Bengaluru / Remote', type: 'Full-time', exp: '3–6 yrs', tags: ['UI/UX', 'Motion', 'Design Systems'] },
  { id: 'c4', title: 'Solutions Architect — EdTech', team: 'Customer Success', location: 'Mumbai / Delhi', type: 'Full-time', exp: '5–9 yrs', tags: ['Integrations', 'SSO', 'ERP'] },
  { id: 'c5', title: 'Curriculum Specialist — STEM', team: 'Content', location: 'Remote', type: 'Full-time', exp: '4–8 yrs', tags: ['Pedagogy', 'STEM', 'Assessment'] },
  { id: 'c6', title: 'Data Engineer', team: 'Data', location: 'Bengaluru', type: 'Full-time', exp: '3–6 yrs', tags: ['Spark', 'dbt', 'Warehousing'] },
]

export const CASE_STUDIES = [
  {
    id: 'cs1',
    name: 'Quantum University',
    type: 'Private University · 24,000 students · 6 campuses',
    headline: '+19% pass rates and a 4-point retention lift in four semesters',
    story: 'Quantum University needed to personalise learning at the scale of 24,000 students across six campuses without inflating faculty workload. MediXO EduX’s adaptive paths now serve 400+ courses; the AI teaching assistant handles 68% of routine grading; and the analytics cloud gives deans a live view of at-risk cohorts by week, not by semester.',
    metrics: [
      { value: '+19%', label: 'Course pass rate' },
      { value: '4 pts', label: 'Retention lift' },
      { value: '11 hrs', label: 'Faculty time saved weekly' },
    ],
    gradient: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'cs2',
    name: 'Pinnacle Group of Schools',
    type: 'K-12 chain · 14 campuses · 31,000 students',
    headline: '60-day rollout across 14 campuses with one parent app',
    story: 'Pinnacle needed consistency across campuses with very different digital maturity. MediXO EduX deployed in 60 days with a train-the-trainer model. Parent engagement rose from 34% to 81% in a single term, and the AI insight cards became the most-read communication the group has ever sent.',
    metrics: [
      { value: '60 days', label: 'To full rollout' },
      { value: '81%', label: 'Parent engagement' },
      { value: '34% → 81%', label: 'Engagement lift' },
    ],
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'cs3',
    name: 'Horizon Institute of Engineering',
    type: 'Autonomous institute · 11,000 students',
    headline: 'Placements up 9.2 points with AI-driven interview coaching',
    story: 'Horizon embedded MediXO EduX’s coding lab and career coach into its placement preparation pipeline. Students completed 140,000+ practice problems in one year; the interview coach ran 22,000 mock rounds. Placement rose from 84.1% to 93.3%, with the average CTC up 18%.',
    metrics: [
      { value: '9.2 pts', label: 'Placement improvement' },
      { value: '22K', label: 'Mock interviews run' },
      { value: '+18%', label: 'Average CTC' },
    ],
    gradient: 'from-blue-500 to-violet-500',
  },
  {
    id: 'cs4',
    name: 'Nexa Business School',
    type: 'B-school · 2,400 students',
    headline: 'Accreditation prep cut from 9 weeks to 3 with the analytics cloud',
    story: 'For Nexa, reporting was the bottleneck: assembling outcome data for accreditation took a committee nine weeks. MediXO EduX’s analytics cloud maps every course to program outcomes automatically, so the export — complete with evidence — now takes three days. Faculty reclaimed the other eight weeks for research.',
    metrics: [
      { value: '9 → 3', label: 'Weeks for accreditation prep' },
      { value: '100%', label: 'Outcome mapping coverage' },
      { value: '8 wks', label: 'Faculty time reclaimed' },
    ],
    gradient: 'from-fuchsia-500 to-indigo-500',
  },
]

export const PLATFORM_STATS = [
  { value: 2400000, label: 'Learners on the platform', suffix: '+' },
  { value: 850, label: 'Institutions', suffix: '+' },
  { value: 38, label: 'Avg. grade improvement', suffix: '%' },
  { value: 12000000, label: 'Questions answered by AI', suffix: '+' },
]

export const CONTACT_INFO = {
  email: 'hello@medixoedux.edu',
  sales: 'sales@medixoedux.edu',
  phone: '+91 1800-419-0419',
  address: 'MediXO EduX, 12th Floor, Prestige Towers, Bengaluru 560001, India',
  hours: 'Mon–Fri, 9:00 AM – 7:00 PM IST',
}
