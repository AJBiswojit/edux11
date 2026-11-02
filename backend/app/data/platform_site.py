"""Landing CMS extras merged into the platform document in Postgres."""

NAV_LINKS = [
    {"label": "Platform", "href": "#platform", "mega": True},
    {"label": "AI Suite", "href": "#ai", "mega": True},
    {"label": "For Institutions", "href": "#journeys", "mega": False},
    {"label": "Pricing", "href": "#pricing", "mega": False},
    {"label": "Resources", "href": "#resources", "mega": True},
]

MEGA_MENU_PLATFORM = [
    {
        "title": "Learning",
        "links": [
            {"label": "AI Academic Intelligence", "desc": "Understand student performance, strengths and learning patterns", "icon": "BrainCircuit", "to": "/student/performance-accuracy"},
            {"label": "MediXO Mentor", "desc": "24×7 conversational academic support", "icon": "Bot", "to": "/student/mentor"},
            {"label": "AI Academic DNA", "desc": "Discover academic strengths, weaknesses and improvement areas", "icon": "Dna", "to": "/student/performance-accuracy?tab=dna"},
            {"label": "AI Personalized Learning", "desc": "Build smarter learning journeys for every student", "icon": "Route", "to": "/student/learning-path"},
        ],
    },
    {
        "title": "Assessment",
        "links": [
            {"label": "Smart Assessments", "desc": "AI-powered assessment and performance intelligence", "icon": "ClipboardCheck", "to": "/student/exam-agent"},
            {"label": "Question Bank", "desc": "Curriculum-aligned and reusable question intelligence", "icon": "Database", "to": "/faculty/question-intelligence?tab=question-intelligence"},
            {"label": "PYQ Intelligence", "desc": "Analyze previous-year questions, patterns and topic trends", "icon": "Sparkles", "to": "/faculty/question-intelligence?tab=pyq"},
            {"label": "AI Question Paper Generator", "desc": "Generate University, JEE and NEET papers in minutes", "icon": "FileSpreadsheet", "to": "/faculty/question-intelligence?tab=paper-generator"},
        ],
    },
    {
        "title": "Institution",
        "links": [
            {"label": "Institution Intelligence", "desc": "Institution-wide academic and performance intelligence", "icon": "BarChart3", "to": "/admin/institution-intelligence"},
            {"label": "Placement Intelligence", "desc": "Track placements, drives, offers and outcomes", "icon": "Briefcase", "to": "/admin/institution-intelligence?tab=outcomes"},
            {"label": "Governance & Audit", "desc": "Roles, permissions and institutional oversight", "icon": "ShieldCheck", "to": "/admin/roles"},
            {"label": "Executive Reporting", "desc": "Turn institutional data into decision-ready reports", "icon": "FileBarChart", "to": "/admin/reports"},
        ],
    },
]

MEGA_MENU_AI = [
    {
        "title": "AI for Students",
        "links": [
            {"label": "AI Academic DNA", "desc": "Strengths, weaknesses and learning patterns", "icon": "Dna", "to": "/student/performance-accuracy?tab=dna"},
            {"label": "AI Exam Intelligence", "desc": "Exam analysis, readiness and predictions", "icon": "BrainCircuit", "to": "/student/exam-analysis"},
            {"label": "AI Career Readiness", "desc": "Career direction and portfolio intelligence", "icon": "Compass", "to": "/student/portfolio"},
        ],
    },
    {
        "title": "AI for Faculty",
        "links": [
            {"label": "AI Teaching Assistant", "desc": "Draft lessons, grade and analyse", "icon": "GraduationCap", "to": "/faculty/ai-assistant"},
            {"label": "Assessment Intelligence", "desc": "Question, PYQ and paper intelligence", "icon": "Sparkles", "to": "/faculty/question-intelligence"},
        ],
    },
    {
        "title": "AI for Institutions",
        "links": [
            {"label": "Executive AI Workspace", "desc": "Ask your institution anything", "icon": "Bot", "to": "/admin/ai-workspace"},
        ],
    },
]

MEGA_MENU_RESOURCES = [
    {
        "title": "Learn",
        "links": [
            {"label": "Blog", "desc": "Product, pedagogy and research", "icon": "Newspaper", "to": "/blog"},
            {"label": "Case Studies", "desc": "How institutions transform with MediXO EduX", "icon": "FileSearch", "to": "/case-studies"},
            {"label": "Help Centre", "desc": "Guides, FAQs and best practices", "icon": "LifeBuoy", "to": "/contact"},
            {"label": "Release Notes", "desc": "What’s new in MediXO EduX", "icon": "Rocket", "to": "/media"},
        ],
    },
    {
        "title": "Company",
        "links": [
            {"label": "About Us", "desc": "Our mission and team", "icon": "Heart", "to": "/about"},
            {"label": "Careers", "desc": "Join a world-class team", "icon": "Briefcase", "to": "/careers"},
            {"label": "Media", "desc": "Press kit and announcements", "icon": "Camera", "to": "/media"},
            {"label": "Contact", "desc": "Talk to our team", "icon": "Mail", "to": "/contact"},
        ],
    },
]

HERO_METRICS = [
    {"value": 2.4, "suffix": "M+", "decimals": 1, "label": "Learners worldwide"},
    {"value": 850, "suffix": "+", "label": "Institutions"},
    {"value": 38, "suffix": "%", "label": "Avg. grade improvement"},
    {"value": 99.9, "suffix": "%", "decimals": 1, "label": "Platform uptime"},
]

TRUSTED_BY = [
    "Meridian Institute of Technology",
    "Quantum University",
    "Stellar Public Schools",
    "Horizon Institute of Engineering",
    "Nexa Business School",
    "Orbit International Academy",
    "Pinnacle Group of Institutions",
    "Vertex College of Design",
]

FEATURES = [
    {"icon": "Sparkles", "title": "AI Tutor, available 24×7", "desc": "A conversational tutor that explains concepts step-by-step, adapts to each learner’s pace and never runs out of patience.", "gradient": "from-indigo-500 to-blue-500"},
    {"icon": "Route", "title": "Adaptive learning paths", "desc": "Every learner gets a path that re-routes itself based on mastery, effort and goals — not a one-size-fits-all syllabus.", "gradient": "from-blue-500 to-teal-400"},
    {"icon": "BarChart3", "title": "Institution analytics cloud", "desc": "Live dashboards for deans, HODs and teachers: retention, at-risk flags, outcomes and placement intelligence in one place.", "gradient": "from-teal-400 to-emerald-500"},
    {"icon": "ClipboardCheck", "title": "Auto-generated assessments", "desc": "Generate quizzes, assignments and full exam papers from a tagged question bank — with plagiarism and difficulty checks.", "gradient": "from-emerald-500 to-indigo-500"},
    {"icon": "HeartHandshake", "title": "Parent connect", "desc": "Parents see progress, attendance and insights in plain language — with AI-written summaries instead of jargon.", "gradient": "from-fuchsia-500 to-indigo-500"},
    {"icon": "ShieldCheck", "title": "Enterprise-grade trust", "desc": "SSO/SAML, role-based access, full audit trails, data residency and 99.9% uptime SLAs for institutions of every size.", "gradient": "from-slate-600 to-indigo-600"},
]

AI_CAPABILITIES = [
    {"icon": "MessageSquareText", "title": "Conversational Tutoring", "desc": "Socratic, step-by-step explanations with worked examples in any subject.", "stat": "4.9/5 student rating"},
    {"icon": "BrainCircuit", "title": "Weakness Detection", "desc": "Continuous mastery modelling pinpoints exactly where a learner struggles.", "stat": "2.1× faster concept mastery"},
    {"icon": "LineChart", "title": "Performance Prediction", "desc": "Early-warning models flag at-risk learners up to 8 weeks in advance.", "stat": "92% prediction accuracy"},
    {"icon": "GraduationCap", "title": "AI Teaching Assistant", "desc": "Lesson drafts, auto-grading and class insights that save faculty 11 hrs/week.", "stat": "11 hrs saved weekly"},
    {"icon": "FileSearch", "title": "GraphRAG Knowledge Search", "desc": "Semantic search across every lecture, note and paper — with cited answers.", "stat": "10× faster research"},
    {"icon": "Briefcase", "title": "Career Intelligence", "desc": "Resume reviews, mock interviews and job matching tuned to each learner.", "stat": "31% more offers"},
]

JOURNEYS = [
    {
        "id": "student",
        "role": "Student",
        "tagline": "Learn less. Master more.",
        "color": "#6366f1",
        "points": [
            {"title": "Personal AI study partner", "desc": "Ask anything, anytime. The AI tutor explains, quizzes and tracks your mastery."},
            {"title": "Adaptive weekly plan", "desc": "Your study planner rebalances itself around exams, deadlines and weak topics."},
            {"title": "Coding + career growth", "desc": "Practice in-browser, build a portfolio, and get coached for interviews."},
        ],
    },
    {
        "id": "faculty",
        "role": "Faculty",
        "tagline": "Teach with superpowers.",
        "color": "#14b8a6",
        "points": [
            {"title": "AI teaching assistant", "desc": "Draft lesson plans, generate questions and auto-grade submissions."},
            {"title": "Classroom intelligence", "desc": "Spot at-risk students early with live analytics across every cohort."},
            {"title": "Research console", "desc": "Track citations, grants and collaborations in one workspace."},
        ],
    },
    {
        "id": "admin",
        "role": "Administrator",
        "tagline": "Run the institution on data.",
        "color": "#8b5cf6",
        "points": [
            {"title": "Institution dashboard", "desc": "Enrolment, retention, outcomes and revenue — live and drillable."},
            {"title": "Governance built-in", "desc": "Granular roles, permissions and a tamper-proof audit trail."},
            {"title": "Placement intelligence", "desc": "Track drives, offers and CTC trends branch-by-branch."},
        ],
    },
    {
        "id": "parent",
        "role": "Parent",
        "tagline": "Stay close, without hovering.",
        "color": "#10b981",
        "points": [
            {"title": "Plain-language insights", "desc": "AI summaries of progress, attendance and effort — no jargon."},
            {"title": "Early alerts", "desc": "Gentle, timely notifications when support could help."},
            {"title": "Direct teacher access", "desc": "Message teachers and book meetings in one tap."},
        ],
    },
]

EXAM_AGENT_GROUP_LABELS = {
    "University": {"label": "University Practice Papers", "sub": "Course-level MCQs · no negative marking"},
    "JEE": {"label": "JEE Main Mocks", "sub": "Physics + Chemistry + Mathematics · +4 / −1"},
    "NEET": {"label": "NEET UG Mocks", "sub": "Physics + Chemistry + Biology · +4 / −1"},
}

PLATFORM_SITE = {
    "navLinks": NAV_LINKS,
    "megaMenuPlatform": MEGA_MENU_PLATFORM,
    "megaMenuAi": MEGA_MENU_AI,
    "megaMenuResources": MEGA_MENU_RESOURCES,
    "heroMetrics": HERO_METRICS,
    "trustedBy": TRUSTED_BY,
    "features": FEATURES,
    "aiCapabilities": AI_CAPABILITIES,
    "journeys": JOURNEYS,
}
