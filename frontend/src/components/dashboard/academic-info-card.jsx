import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BookOpen, Building2, IdCard, MapPin, Users,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/utils/cn'

/**
 * Student Academic Information Card.
 *
 * Reusable, presentation-only component that renders the student's academic
 * identity (name, ID, program, branch, semester, section, mentor, CGPA,
 * attendance) in a premium, responsive card with two clear CTAs:
 *   - "View program" → /student/programs
 *   - "Open Academics" → /student/academics
 *
 * Design goals:
 *   • Premium visual presentation — gradient glows, refined spacing,
 *     accessible contrast in both light and dark mode.
 *   • Fully responsive — gracefully stacks and reflows on mobile, tablet
 *     (sm/md) and desktop (lg/xl/2xl).
 *   • No data fetching, no intelligence calculations, no routing logic —
 *     callers pass a shaped `profile` object.
 */

const DEFAULT_PROFILE = {
  name: 'Student',
  initials: 'AS',
  studentId: '—',
  rollNo: '',
  enrollmentNo: '',
  program: '—',
  branch: '—',
  department: '',
  semester: '—',
  section: '—',
  batch: '',
  institution: '',
  mentor: '—',
  cgpa: '—',
  attendance: '—',
  academicStatus: 'Regular',
}

/** Normalize caller-provided profile into the shape the card expects. */
function normalizeProfile(raw) {
  const p = { ...DEFAULT_PROFILE, ...(raw ?? {}) }
  const name = p.name || p.fullName || DEFAULT_PROFILE.name
  const derivedInitials = (name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ? w[0].toUpperCase() : ''))
    .join(''))
  const initials = p.initials ?? (derivedInitials || 'AS')
  const studentId = p.studentId ?? p.rollNo ?? DEFAULT_PROFILE.studentId
  const attendance = p.attendance != null && p.attendance !== '' ? `${p.attendance}%` : '—'
  const cgpa = p.cgpa ?? '—'
  return {
    ...p,
    name,
    initials,
    studentId,
    attendance,
    cgpa,
    department: p.department ?? p.branch ?? DEFAULT_PROFILE.department,
  }
}

/** Status tone for the academic status pill. */
function statusTone(status) {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('probation') || s.includes('detain') || s.includes('back')) {
    return 'danger'
  }
  if (s.includes('leave') || s.includes('wait')) return 'warning'
  if (s.includes('regular') || s.includes('active') || s === '') return 'success'
  return 'secondary'
}

const FIELD_DEFS = [
  { key: 'studentId', label: 'Student ID', icon: IdCard, primary: true },
  // { key: 'enrollmentNo', label: 'Enrollment No.', icon: Hash, primary: false, hideWhenFalsy: true },
  // { key: 'program', label: 'Program', icon: GraduationCap, primary: true },
  // { key: 'branch', label: 'Branch / Dept.', icon: BookOpen, primary: true },
  // { key: 'semester', label: 'Semester', icon: Activity, primary: true },
  // { key: 'section', label: 'Section', icon: Target, primary: true },
  { key: 'batch', label: 'Batch', icon: Users, primary: false, hideWhenFalsy: true },
  // { key: 'mentor', label: 'Academic Mentor', icon: Sparkles, primary: false },
  // { key: 'cgpa', label: 'CGPA', icon: Gauge, primary: true, accent: 'indigo' },
  // { key: 'attendance', label: 'Attendance', icon: Activity, primary: true, accent: 'emerald' },
]

function DetailChip({ icon: Icon, label, value, accent, className }) {
  return (
    <div
      className={cn(
        'group relative flex min-w-[168px] flex-1 flex-col justify-between gap-1.5 rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200',
        'bg-slate-50/80 ring-slate-100 hover:-translate-y-0.5 hover:bg-white hover:ring-indigo-200/80 hover:shadow-sm',
        'dark:bg-slate-800/40 dark:ring-slate-800 dark:hover:bg-slate-800/70 dark:hover:ring-indigo-500/40',
        accent === 'indigo' && 'bg-indigo-50/70 ring-indigo-100 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:ring-indigo-500/25',
        accent === 'emerald' && 'bg-emerald-50/70 ring-emerald-100 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:ring-emerald-500/25',
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </p>
      <p
        className={cn(
          'text-sm font-bold leading-snug text-slate-900 dark:text-slate-100',
          accent === 'indigo' && 'text-indigo-700 dark:text-indigo-300',
          accent === 'emerald' && 'text-emerald-700 dark:text-emerald-300'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function AcademicInfoCard({
  profile: rawProfile,
  className,
  /** Optional: replace default "View program" link. */
  programHref = '/student/programs',
  /** Optional: replace default "Open Academics" link. */
  academicsHref = '/student/academics',
}) {
  const profile = normalizeProfile(rawProfile)

  const chips = FIELD_DEFS.filter((f) => !(f.hideWhenFalsy && !profile[f.key]))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      role="region"
      aria-label="Academic information"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border bg-white shadow-card',
          'border-slate-200/70 dark:border-slate-800 dark:bg-slate-900/80',
          'backdrop-blur-sm'
        )}
      >
        {/* Decorative gradient glows — pure presentation, no meaning. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-teal-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-tr from-fuchsia-500/10 via-indigo-500/5 to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"
        />

        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
          {/* ---------- Identity block ---------- */}
          <div className="flex items-start gap-5 sm:gap-6 lg:min-w-[280px] lg:max-w-md lg:shrink-0">
            <div className="relative shrink-0">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 font-display text-xl font-bold text-white shadow-lift sm:h-20 sm:w-20 sm:text-2xl sm:rounded-3xl"
                aria-hidden="true"
              >
                {profile.initials}
              </div>
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900',
                  'shadow-sm shadow-emerald-500/40'
                )}
                title="Active student"
                aria-label="Active student"
              >
                ✓
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                  Academic information
                </p>
                {profile.academicStatus && (
                  <Badge variant={statusTone(profile.academicStatus)} size="sm">
                    {profile.academicStatus}
                  </Badge>
                )}
              </div>

              <h2 className="mt-1.5 text-lg font-bold leading-tight text-slate-900 dark:text-white sm:text-xl">
                {profile.name}
              </h2>

              {profile.institution && (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-snug">{profile.institution}</span>
                </p>
              )}

              {profile.department && profile.department !== profile.institution && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-snug">{profile.department}</span>
                </p>
              )}

              <Link
                to={programHref}
                className="group/link mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <span className="underline-offset-4 group-hover/link:underline">View program details</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* ---------- Divider ---------- */}
          <div
            aria-hidden="true"
            className="hidden w-px self-stretch bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block dark:via-slate-700/70"
          />
          <div
            aria-hidden="true"
            className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:hidden dark:via-slate-700/70"
          />

          {/* ---------- Detail grid ---------- */}
          <div className="flex flex-1 flex-wrap content-center gap-3">
            {chips.map((f) => (
              <DetailChip
                key={f.key}
                icon={f.icon}
                label={f.label}
                value={profile[f.key]}
                accent={f.accent}
              />
            ))}
          </div>

          {/* ---------- Actions ---------- */}
          <div
            aria-hidden="true"
            className="hidden w-px self-stretch bg-gradient-to-b from-transparent via-slate-200 to-transparent xl:block dark:via-slate-700/70"
          />

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:justify-center xl:min-w-[170px]">
            <Button
              asChild
              variant="default"
              size="sm"
              className="w-full gap-2"
            >
              <Link to={academicsHref}>
                <BookOpen className="h-4 w-4" />
                Open Academics
                <ArrowRight className="h-3.5 w-3.5 opacity-80" />
              </Link>
            </Button>
            {/* View program button — temporarily commented out */}
            {/* <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Link to={programHref}>
                <FileText className="h-4 w-4" />
                View program
              </Link>
            </Button> */}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export { AcademicInfoCard }
export default AcademicInfoCard
