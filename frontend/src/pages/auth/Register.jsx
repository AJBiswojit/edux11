import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, ArrowRight, BrainCircuit, Building2, CalendarDays, Check,
  GraduationCap, Rocket, Target, UserRound,
} from 'lucide-react'
import { Button, Field, Input, Select, SelectItem, Checkbox, useToast } from '@/components/ui'
import { useRegistrationOptions, useRegister } from '@/services/auth'
import { Spinner } from '@/components/shared/loading'
import { RULES, validateConfirmPassword } from '@/validators'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/auth-context'

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

/**
 * Student Registration — Step 1 · Basic Information + Step 2 · Academic Context.
 * University and Competitive can BOTH be selected (a student may be a
 * university student AND a JEE/NEET aspirant). After validation the flow
 * moves to OTP verification (/auth/verify-otp, purpose=register).
 */
function Register() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [universityEnabled, setUniversityEnabled] = useState(true)
  const [competitiveEnabled, setCompetitiveEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { data: optionsData, isLoading: optionsLoading, isError: optionsError, refetch } = useRegistrationOptions()
  const { mutateAsync: register } = useRegister()

  const { register: reg, handleSubmit, trigger, setValue, formState: { errors } } = useForm({
    defaultValues: {
      fullName: '', email: '', phone: '', dob: '', gender: '', password: '', confirmPassword: '',
    },
  })
  /* Select values live in plain state — the Select component is controlled
     with value + onValueChange (same pattern as the faculty workspaces). */
  const [gender, setGender] = useState('')
  const [institution, setInstitution] = useState('')
  const [degree, setDegree] = useState('')
  const [branch, setBranch] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [targetExam, setTargetExam] = useState('')
  const [targetYear, setTargetYear] = useState('')
  const [preparationStatus, setPreparationStatus] = useState('')

  /* Dynamic form (Part: do not reload — sections show/hide based on context) */
  const showUniversity = universityEnabled
  const showCompetitive = competitiveEnabled

  const stepOneValid = async () => {
    const ok = await trigger(['fullName', 'email', 'phone', 'dob', 'gender', 'password', 'confirmPassword'])
    if (ok) setStep(2)
  }

  const stepTwoValid = () => {
    if (!universityEnabled && !competitiveEnabled) {
      toast.error('Choose a path', 'Select University Education, Competitive Exam Preparation, or both.')
      return false
    }
    if (universityEnabled && (!institution || !degree || !branch || !academicYear || !semester)) {
      toast.error('Complete university details', 'Fill every university field to continue.')
      return false
    }
    if (competitiveEnabled && (!targetExam || !targetYear || !preparationStatus)) {
      toast.error('Complete competitive details', 'Fill every competitive field to continue.')
      return false
    }
    return true
  }

  const onSubmit = async (data) => {
    if (!stepTwoValid()) return
    setSubmitting(true)
    try {
      const result = await register({
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        dob: data.dob,
        gender: data.gender,
        password: data.password,
        university: universityEnabled ? {
          institution, degree, branch, academicYear, semester,
        } : null,
        competitive: competitiveEnabled ? {
          targetExam, targetYear, preparationStatus,
        } : null,
      })
      // /register creates user immediately and returns tokens — log in directly.
      await login({ session: result })
      toast.success(`Welcome, ${result.user?.firstName ?? data.fullName.trim().split(' ')[0]}! 🎉`, 'Your account is ready.')
      navigate('/student', { replace: true })
    } catch (err) {
      toast.error('Registration failed', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Show a compact loading indicator inside the form rather than replacing the whole page.
  // If options fail, the form still renders — dropdowns are just empty (student can retry).
  const options = optionsData ?? { institutions: [], degrees: [], branches: [], academicYears: [], semesters: [], targetExams: [], targetYears: [], preparationStatuses: [] }

  const selectItem = (v) => (
    <SelectItem key={v} value={v}>{v}</SelectItem>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-glow">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create your student account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Join MediXO EduX in under two minutes — university, competitive, or both.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-8 flex items-center gap-2">
        {[{ n: 1, label: 'Basic information', icon: UserRound }, { n: 2, label: 'Academic context', icon: Target }].map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition-all duration-300',
                  step > s.n
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                    : step === s.n
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                )}
              >
                {step > s.n ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </span>
              <span className={cn('hidden text-xs font-bold sm:block', step >= s.n ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>{s.label}</span>
            </div>
            {i < 1 && <div className={cn('h-0.5 flex-1 rounded-full transition-colors duration-500', step > s.n ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-200 dark:bg-slate-800')} />}
          </div>
        ))}
      </div>

      {/* Options loading/error notice — form is always shown */}
      {optionsLoading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Spinner size="sm" /> Loading form options…
        </div>
      )}
      {optionsError && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <span>Could not load some options — dropdowns may be empty.</span>
          <button onClick={() => refetch()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
        {/* ================= STEP 1 · BASIC INFORMATION ================= */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" required error={errors.fullName?.message} className="sm:col-span-2">
                <Input placeholder="e.g. Priya Sharma" autoComplete="name" {...reg('fullName', RULES.name)} />
              </Field>
              <Field label="Email address" required error={errors.email?.message}>
                <Input type="email" placeholder="you@example.com" autoComplete="email" {...reg('email', RULES.email)} />
              </Field>
              <Field label="Mobile number" required error={errors.phone?.message}>
                <Input type="tel" placeholder="+91 98765 43210" autoComplete="tel" {...reg('phone', RULES.phone)} />
              </Field>
              <Field label="Date of birth" required error={errors.dob?.message}>
                <Input type="date" {...reg('dob', { validate: (v) => (v ? true : 'Date of birth is required') })} />
              </Field>
              <Field label="Gender" required error={errors.gender?.message}>
                <input type="hidden" {...reg('gender', { validate: (v) => (v ? true : 'Gender is required') })} />
                <Select
                  value={gender}
                  onValueChange={(v) => { setGender(v); setValue('gender', v, { shouldValidate: true }) }}
                  placeholder="Select gender…"
                >
                  {GENDERS.map(selectItem)}
                </Select>
              </Field>
              <Field label="Password" required error={errors.password?.message} hint="At least 8 characters with an uppercase letter and a number.">
                <Input type="password" placeholder="••••••••" autoComplete="new-password"
                  {...reg('password', RULES.strongPassword)}
                  onChange={(e) => { setPassword(e.target.value); reg('password').onChange(e) }}
                />
              </Field>
              <Field label="Confirm password" required error={errors.confirmPassword?.message}>
                <Input type="password" placeholder="••••••••" autoComplete="new-password"
                  {...reg('confirmPassword', { validate: (v) => validateConfirmPassword(v, password) })}
                />
              </Field>
            </div>
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[11.5px] leading-relaxed text-slate-400 dark:bg-slate-800/60">
              <BrainCircuit className="mr-1 inline h-3.5 w-3.5 text-indigo-500" />
              Your profile powers the Student Intelligence Foundation — AI Academic DNA, readiness and recommendations adapt to the context you choose next.
            </p>
            <Button type="button" size="lg" className="w-full" onClick={stepOneValid}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* ================= STEP 2 · ACADEMIC CONTEXT ================= */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select everything that applies — you can be a university student <span className="font-semibold text-slate-700 dark:text-slate-200">and</span> a JEE/NEET aspirant at the same time.
            </p>

            {/* University Education */}
            <div className={cn('rounded-3xl border p-5 transition-all', universityEnabled ? 'border-indigo-300/70 bg-indigo-50/40 ring-1 ring-indigo-500/15 dark:border-indigo-500/40 dark:bg-indigo-500/5' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md', universityEnabled ? 'bg-gradient-to-br from-indigo-600 to-blue-600' : 'bg-slate-300 dark:bg-slate-700')}>
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">University Education</p>
                    <p className="text-[11.5px] text-slate-400">Degree, branch, semester & academic year</p>
                  </div>
                </div>
                <Checkbox checked={universityEnabled} onCheckedChange={setUniversityEnabled} label="" aria-label="Toggle university education" />
              </div>

              {showUniversity && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Institution" required error={errors.institution?.message} className="sm:col-span-2">
                    <Select value={institution} onValueChange={setInstitution} placeholder="Select your institution…">
                      {(options.institutions ?? []).map((i) => <SelectItem key={i.id} value={i.name}>{i.name}{i.city ? ` · ${i.city}` : ''}</SelectItem>)}
                    </Select>
                  </Field>
                  <Field label="Degree" required error={errors.degree?.message}>
                    <Select value={degree} onValueChange={setDegree} placeholder="Select degree…">
                      {(options.degrees ?? []).map(selectItem)}
                    </Select>
                  </Field>
                  <Field label="Branch / Department" required error={errors.branch?.message}>
                    <Select value={branch} onValueChange={setBranch} placeholder="Select branch…">
                      {(options.branches ?? []).map(selectItem)}
                    </Select>
                  </Field>
                  <Field label="Academic year" required error={errors.academicYear?.message}>
                    <Select value={academicYear} onValueChange={setAcademicYear} placeholder="Select year…">
                      {(options.academicYears ?? []).map(selectItem)}
                    </Select>
                  </Field>
                  <Field label="Current semester" required error={errors.semester?.message}>
                    <Select value={semester} onValueChange={setSemester} placeholder="Select semester…">
                      {(options.semesters ?? []).map(selectItem)}
                    </Select>
                  </Field>
                </div>
              )}
            </div>

            {/* Competitive Exam Preparation */}
            <div className={cn('rounded-3xl border p-5 transition-all', competitiveEnabled ? 'border-teal-300/70 bg-teal-50/40 ring-1 ring-teal-500/15 dark:border-teal-500/40 dark:bg-teal-500/5' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md', competitiveEnabled ? 'bg-gradient-to-br from-teal-500 to-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}>
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">Competitive Exam Preparation</p>
                    <p className="text-[11.5px] text-slate-400">JEE, NEET & more — target year & status</p>
                  </div>
                </div>
                <Checkbox checked={competitiveEnabled} onCheckedChange={setCompetitiveEnabled} label="" aria-label="Toggle competitive exam preparation" />
              </div>

              {showCompetitive && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Target exam" required error={errors.targetExam?.message}>
                    <Select value={targetExam} onValueChange={setTargetExam} placeholder="Select exam…">
                      {(options.targetExams ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </Select>
                  </Field>
                  <Field label="Target year" required error={errors.targetYear?.message}>
                    <Select value={targetYear} onValueChange={setTargetYear} placeholder="Select year…">
                      {(options.targetYears ?? []).map(selectItem)}
                    </Select>
                  </Field>
                  <Field label="Preparation status" required error={errors.preparationStatus?.message} className="sm:col-span-2">
                    <Select value={preparationStatus} onValueChange={setPreparationStatus} placeholder="Where are you in your prep?">
                      {(options.preparationStatuses ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </Select>
                  </Field>
                  {targetExam && (
                    <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-2.5 text-[11.5px] font-semibold text-teal-700 sm:col-span-2 dark:bg-teal-500/10 dark:text-teal-300">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {(options.targetExams ?? []).find((e) => e.id === targetExam)?.name} · subjects: {(options.targetExams ?? []).find((e) => e.id === targetExam)?.subjects?.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? 'Creating account…' : (<><Rocket className="h-4 w-4" /> Create account</>)}
              </Button>
            </div>
          </motion.div>
        )}
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Sign in</Link>
      </p>
    </motion.div>
  )
}

export { Register }
export default Register
