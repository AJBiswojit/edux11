/**
 * MediXO EduX — shared UI constants.
 *
 * Single source of truth for constants that are duplicated across Student and
 * Faculty modules. Only GENUINELY identical structures are consolidated here;
 * constants with different semantic meanings stay local to their modules.
 */

import { Presentation, CalendarCheck2, FileText, CheckCircle2, Repeat, FileCheck2, Zap, ClipboardList, Megaphone } from 'lucide-react'

/* Domain (University / Competitive) badge variant map. */
export const DOMAIN_BADGE = { University: 'info', Competitive: 'gradient' }

/* Exam family (JEE / NEET) badge variant map. */
export const FAMILY_BADGE = { JEE: 'warning', NEET: 'success' }

/* Derived student academic-status badge variant map (My Students / Profile). */
export const STUDENT_STATUS_STYLES = { Strong: 'success', Improving: 'info', Stable: 'secondary', 'Needs Attention': 'danger', 'No exams': 'outline' }

/* Support ticket status badge variant map (Student & Faculty Support). */
export const SUPPORT_STATUS_STYLES = { Open: 'info', 'In Progress': 'warning', Resolved: 'success' }

/* Priority badge variant map used across faculty dashboards / teaching workspace. */
export const PRIORITY_VARIANT = { Critical: 'danger', High: 'warning', Medium: 'secondary', Low: 'default' }

/* Activity/timeline type → icon + gradient map (faculty dashboard + teaching timeline). */
export const ACTIVITY_TYPE_ICON = {
  lecture: { Icon: Presentation, cls: 'from-indigo-500 to-blue-500' },
  attendance: { Icon: CalendarCheck2, cls: 'from-emerald-500 to-teal-500' },
  assignment: { Icon: FileText, cls: 'from-violet-500 to-purple-500' },
  evaluation: { Icon: CheckCircle2, cls: 'from-emerald-500 to-teal-500' },
  revision: { Icon: Repeat, cls: 'from-amber-500 to-orange-500' },
  paper: { Icon: FileCheck2, cls: 'from-sky-500 to-cyan-500' },
  quiz: { Icon: Zap, cls: 'from-fuchsia-500 to-pink-500' },
  exam: { Icon: ClipboardList, cls: 'from-rose-500 to-red-500' },
  announcement: { Icon: Megaphone, cls: 'from-slate-500 to-slate-600' },
}

/* Canonical MC option labels. */
export const QUESTION_OPTION_LABELS = ['A', 'B', 'C', 'D']
