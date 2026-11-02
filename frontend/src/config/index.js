/**
 * MediXO EduX — global application configuration.
 *
 * Phase 11 — the runtime is a STRICT BACKEND-CONSUMING frontend. The
 * in-browser prototype adapter / mock router has been REMOVED from
 * production. There is no `USE_MOCK_API` flag and no runtime branching
 * that could switch the app into mock mode.
 */
export const APP_CONFIG = {
  name: 'MediXO EduX',
  tagline: 'Empowering Smarter Learning Through AI',
  version: '1.0.0',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/v1',
  TOKEN_KEY: 'EduX_access_token',
  REFRESH_TOKEN_KEY: 'EduX_refresh_token',
  USER_KEY: 'EduX_user',
  THEME_KEY: 'EduX_theme',
  supportEmail: 'support@medixoedux.edu',
  supportPhone: '+91 1800-419-0419',
  institution: 'MediXO EduX',
}

/**
 * Feature flags — which product surfaces are active in the CURRENT version.
 * Parent/Guardian is NOT part of the current product: its pages, routes and
 * data are preserved in the codebase (future version) but the portal is
 * disabled and unreachable while this flag is false.
 */
export const FEATURE_FLAGS = {
  parentPortal: false,
}

export const NAV_GROUPS = {
  student: [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: '/student', icon: 'LayoutDashboard' },
        // { label: 'Calendar', to: '/student/calendar', icon: 'CalendarDays' },
      ],
    },
    {
      label: 'Academics',
      items: [
        // { label: 'Programs', to: '/student/programs', icon: 'GraduationCap' },
        // { label: 'Academics', to: '/student/academics', icon: 'BookOpen' },
        { label: 'Assignments', to: '/student/assignments', icon: 'FileText' },
        // { label: 'Attendance', to: '/student/attendance', icon: 'CalendarCheck2' },
        { label: 'Examinations', to: '/student/exam-agent', icon: 'ClipboardList' },
        // { label: 'Micro-Assessments', to: '/student/micro-assessments', icon: 'ClipboardCheck', badge: 'New', matchDescendants: true },
      ],
    },
    {
      label: 'AI Academic Intelligence',
      items: [
        { label: 'AI Exam Analysis', to: '/student/exam-analysis', icon: 'BrainCircuit' },
        // { label: 'Performance & Accuracy', to: '/student/performance-accuracy', icon: 'Crosshair' },
      ],
    },
    // {
    //   label: 'Communication',
    //   items: [
    //     { label: 'Discussion Forum', to: '/student/forum', icon: 'MessagesSquare' },
    //     { label: 'Support', to: '/student/support', icon: 'LifeBuoy' },
    //   ],
    // },
  ],
  faculty: [
    {
      label: 'Workspace',
      items: [
        { label: 'Dashboard', to: '/faculty', icon: 'LayoutDashboard' },
        // { label: 'Teaching', to: '/faculty/teaching', icon: 'Presentation', badge: '★' },
        { label: 'Assessment Intelligence', to: '/faculty/question-intelligence', icon: 'BrainCircuit' },
        // { label: 'AI Micro-Assessment Studio', to: '/faculty/question-intelligence/micro-assessment', icon: 'Sparkles', badge: 'New' },
        { label: 'My Students', to: '/faculty/my-students', icon: 'UsersRound', matchDescendants: true },
        // { label: 'Reports', to: '/faculty/reports', icon: 'FileBarChart' },
        // { label: 'AI Workspace', to: '/faculty/ai-assistant', icon: 'Sparkles' },
        // { label: 'Calendar', to: '/faculty/timetable', icon: 'CalendarDays' },
        { label: 'Support', to: '/faculty/support', icon: 'LifeBuoy' },
      ],
    },
  ],
admin: [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: '/admin', icon: 'LayoutDashboard' },
        { label: 'Institution Intelligence', to: '/admin/institution-intelligence', icon: 'BrainCircuit' },
      ],
    },
    {
      label: 'Academics',
      items: [
        { label: 'Programs', to: '/admin/programs', icon: 'GraduationCap' },
        { label: 'Subjects', to: '/admin/subjects', icon: 'Library' },
        { label: 'Courses', to: '/admin/courses', icon: 'BookOpen' },
        { label: 'Batches', to: '/admin/batches', icon: 'Users' },
        { label: 'Academic Calendar', to: '/admin/calendar', icon: 'CalendarDays' },
      ],
    },
    {
      label: 'People',
      items: [
        { label: 'All Users', to: '/admin/users', icon: 'Users' },
        { label: 'Faculty', to: '/admin/faculty', icon: 'GraduationCap' },
        { label: 'Students', to: '/admin/students', icon: 'UserRound' },
        { label: 'Departments', to: '/admin/departments', icon: 'Building2' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { label: 'Executive Reports', to: '/admin/reports', icon: 'FileBarChart' },
        { label: 'AI Workspace', to: '/admin/ai-workspace', icon: 'BrainCircuit' },
        { label: 'Question Bank', to: '/admin/question-bank', icon: 'Database' },
        { label: 'Exam Oversight', to: '/admin/exams', icon: 'ShieldAlert' },
        { label: 'Research', to: '/admin/research', icon: 'FlaskConical' },
      ],
    },
    {
      label: 'Finance & Aid',
      items: [
        { label: 'Revenue', to: '/admin/revenue', icon: 'IndianRupee' },
        { label: 'Scholarships', to: '/admin/scholarships', icon: 'Award' },
      ],
    },
    {
      label: 'Governance',
      items: [
        { label: 'Roles', to: '/admin/roles', icon: 'ShieldCheck' },
        { label: 'Permissions', to: '/admin/permissions', icon: 'KeyRound' },
        { label: 'Audit Logs', to: '/admin/audit-logs', icon: 'ScrollText' },
        { label: 'AI Configuration', to: '/admin/ai-config', icon: 'Bot' },
        { label: 'CMS', to: '/admin/cms', icon: 'LayoutTemplate' },
        { label: 'API Configuration', to: '/admin/api-config', icon: 'Plug2' },
        { label: 'Data Export / Import', to: '/admin/data-tools', icon: 'DatabaseZap' },
        { label: 'Settings', to: '/admin/settings', icon: 'Settings' },
      ],
    },
    {
      label: 'Support',
      items: [
        { label: 'Support', to: '/admin/support', icon: 'LifeBuoy' },
      ],
    },
  ],
  parent: [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: '/parent', icon: 'LayoutDashboard' },
        { label: 'AI Insights', to: '/parent/ai-insights', icon: 'Sparkles' },
        { label: 'Calendar', to: '/parent/calendar', icon: 'CalendarDays' },
      ],
    },
    {
      label: 'Ward Progress',
      items: [
        { label: 'Progress', to: '/parent/progress', icon: 'TrendingUp' },
        { label: 'Attendance', to: '/parent/attendance', icon: 'CalendarCheck2' },
        { label: 'Performance', to: '/parent/performance', icon: 'BarChart3' },
        { label: 'Assignments', to: '/parent/assignments', icon: 'FileText' },
        { label: 'Exam Results', to: '/parent/exam-results', icon: 'ClipboardList' },
        { label: 'Behaviour', to: '/parent/behavior', icon: 'HeartHandshake' },
        { label: 'Reports', to: '/parent/reports', icon: 'FileBarChart' },
        { label: 'Downloads', to: '/parent/downloads', icon: 'FolderDown' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Fee Summary', to: '/parent/fees', icon: 'Wallet' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { label: 'Teacher Communication', to: '/parent/communication', icon: 'MessageSquare' },
        { label: 'Notifications', to: '/parent/notifications', icon: 'Bell' },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Settings & Profile', to: '/parent/settings', icon: 'Settings' },
      ],
    },
  ],
}

export const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  parent: 'Parent',
  admin: 'Administrator',
}

export const ROLE_HOME = {
  student: '/student',
  faculty: '/faculty',
  parent: '/parent',
  admin: '/admin',
}

export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  PARENT: 'parent',
  ADMIN: 'admin',
}
