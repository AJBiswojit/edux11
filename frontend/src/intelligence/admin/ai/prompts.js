/**
 * Executive AI — supported prompt library + intent detection patterns.
 * The AI workspace is a CONSUMER of intelligence: these prompts map user
 * questions to intents; the response engine then reads the derived
 * snapshot. No new intelligence sources live here.
 */

/* ---------- quick prompts (clickable chips) ---------- */
export const EXEC_QUICK_PROMPTS = [
  { id: 'qp1', label: 'Analyze Institution', prompt: 'What is the current institutional health?' },
  { id: 'qp2', label: 'Find Student Risks', prompt: 'How many students are at risk and why?' },
  { id: 'qp3', label: 'Compare Departments', prompt: 'Which department is performing best?' },
  { id: 'qp4', label: 'Analyze Faculty', prompt: 'How is faculty performance?' },
  { id: 'qp5', label: 'Review Academic Health', prompt: 'What are the major academic risks?' },
  { id: 'qp6', label: 'Analyze Assessments', prompt: 'How are assessments performing?' },
  { id: 'qp7', label: 'Generate Executive Summary', prompt: 'Generate an executive summary.' },
  { id: 'qp8', label: "Today's Priorities", prompt: 'Show me the current priorities.' },
]

/* ---------- intent patterns ---------- */
export const INTENT_PATTERNS = [
  { id: 'institution', label: 'Institution Overview', keywords: ['institution', 'overall', 'overview', 'health', 'performance of the institution', 'how is the institution'] },
  { id: 'student-risk', label: 'Student Risk', keywords: ['student', 'risk', 'at-risk', 'at risk', 'attendance risk'] },
  { id: 'faculty', label: 'Faculty Performance', keywords: ['faculty', 'teaching', 'professor'] },
  { id: 'department', label: 'Department Performance', keywords: ['department', 'compare', 'best department', 'worst department', ' cse ', ' ce ', ' ece ', ' mba ', 'des'] },
  { id: 'academic', label: 'Academic Performance', keywords: ['academic', 'retention', 'cgpa', 'pass rate', 'subjects'] },
  { id: 'assessment', label: 'Assessment Health', keywords: ['assessment', 'exam', 'assignments', 'readiness'] },
  { id: 'attendance', label: 'Attendance', keywords: ['attendance', 'absent', 'present'] },
  { id: 'outcomes', label: 'Institutional Outcomes', keywords: ['placement', 'outcome', 'ctc', 'offers', 'drives', 'scholarship'] },
  { id: 'summary', label: 'Executive Summary', keywords: ['executive summary', 'summarize', 'summarise', 'summary'] },
  { id: 'recommendations', label: 'Recommendations', keywords: ['recommend', 'priority', 'priorities', 'focus on', 'action plan', 'should management'] },
  { id: 'trend', label: 'Trend Analysis', keywords: ['trend', 'trending', 'improving', 'declining', 'over time'] },
  { id: 'report', label: 'Report Generation', keywords: ['report', 'generate a report', 'create a report'] },
  { id: 'strongest', label: 'Strongest Areas', keywords: ['strongest', 'best performing', 'top area', 'strengths'] },
  { id: 'weakest', label: 'Weakest Areas', keywords: ['weakest', 'worst', 'needs attention', 'attention', 'weaknesses', 'weak area'] },
]

/* ---------- deterministic intent detection ---------- */
export function detectIntent(question = '') {
  const q = question.toLowerCase()
  /* specificity-first: check multi-word patterns before single words */
  const ranked = [...INTENT_PATTERNS].sort((a, b) => b.keywords.length - a.keywords.length)
  for (const intent of ranked) {
    const matched = intent.keywords.filter((k) => q.includes(k.toLowerCase()))
    if (matched.length >= 2) return { id: intent.id, label: intent.label, matched: matched.length }
  }
  for (const intent of INTENT_PATTERNS) {
    if (intent.keywords.some((k) => q.includes(k.toLowerCase()))) return { id: intent.id, label: intent.label, matched: 1 }
  }
  return { id: null, label: 'Unsupported', matched: 0 }
}

/* ---------- navigation map (existing routes only) ---------- */
export const INTENT_NAV = {
  institution: { label: 'View Institution Intelligence', to: '/admin/institution-intelligence?tab=overview' },
  'student-risk': { label: 'View Student Intelligence', to: '/admin/institution-intelligence?tab=students' },
  faculty: { label: 'View Faculty Intelligence', to: '/admin/institution-intelligence?tab=faculty' },
  department: { label: 'View Department Intelligence', to: '/admin/institution-intelligence?tab=departments' },
  academic: { label: 'View Academic Intelligence', to: '/admin/institution-intelligence?tab=academic' },
  assessment: { label: 'View Assessment Intelligence', to: '/admin/institution-intelligence?tab=assessment' },
  attendance: { label: 'View Attendance & Engagement', to: '/admin/institution-intelligence?tab=attendance' },
  outcomes: { label: 'View Institutional Outcomes', to: '/admin/institution-intelligence?tab=outcomes' },
  summary: { label: 'Open Reports', to: '/admin/reports' },
  recommendations: { label: 'Open Risk & Intervention', to: '/admin/institution-intelligence?tab=risk' },
  trend: { label: 'View Institution Trends', to: '/admin/institution-intelligence?tab=overview' },
  report: { label: 'Open Report Center', to: '/admin/reports?tab=center' },
  strongest: { label: 'View Department Intelligence', to: '/admin/institution-intelligence?tab=departments' },
  weakest: { label: 'View Risk & Intervention', to: '/admin/institution-intelligence?tab=risk' },
}

export default { EXEC_QUICK_PROMPTS, INTENT_PATTERNS, detectIntent, INTENT_NAV }
