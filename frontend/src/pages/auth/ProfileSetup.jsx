import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Bot, Building2, Check, GraduationCap, HeartHandshake, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Button, Field, Input, Select, useToast } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_HOME, ROLES } from '@/config'
import { cn } from '@/utils/cn'

const INTERESTS = ['Machine Learning', 'Web Development', 'Competitive Programming', 'Data Science', 'AI Research', 'Design', 'Entrepreneurship', 'Robotics', 'Cloud & DevOps', 'Mathematics']

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: GraduationCap },
  { value: ROLES.FACULTY, label: 'Faculty', icon: Bot },
  { value: ROLES.PARENT, label: 'Parent', icon: HeartHandshake },
  { value: ROLES.ADMIN, label: 'Administrator', icon: ShieldCheck },
]

function ProfileSetup() {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT)
  const [interests, setInterests] = useState([])
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { fullName: '', phone: '', institution: '', department: '' } })
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const values = watch()

  const toggleInterest = (tag) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 4 ? prev : [...prev, tag]))
  }

  const next = () => {
    if (step === 1 && (values.fullName?.length < 3 || values.phone?.length < 10)) {
      toast.error('Almost there', 'Please complete your name and phone number.')
      return
    }
    if (step === 2 && interests.length === 0) {
      toast.error('Pick at least one', 'Select at least one learning interest to continue.')
      return
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  const finish = () => {
    updateUser({ ...values, role: selectedRole, interests })
    toast.success('Profile complete 🎉', 'Welcome to MediXO EduX — your workspace is ready.')
    navigate(ROLE_HOME[selectedRole], { replace: true })
  }

  const steps = [
    { n: 1, label: 'About you', icon: UserRound },
    { n: 2, label: 'Interests', icon: Sparkles },
    { n: 3, label: 'Workspace', icon: Building2 },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
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
              <span className={cn('hidden text-xs font-bold sm:block', step >= s.n ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 rounded-full transition-colors duration-500', step > s.n ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-200 dark:bg-slate-800')} />}
          </div>
        ))}
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {step === 1 && 'Tell us about yourself'}
        {step === 2 && 'What are you excited about?'}
        {step === 3 && 'Set up your workspace'}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {step === 1 && 'We use this to personalise your experience from day one.'}
        {step === 2 && 'Pick up to 4 areas — your AI paths and recommendations adapt to them.'}
        {step === 3 && 'One last step. Choose how you’ll use MediXO EduX.'}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7"
        >
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Full name" required error={errors.fullName?.message}>
                <Input placeholder="Aarav Sharma" {...register('fullName')} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone number" required error={errors.phone?.message}>
                  <Input type="tel" placeholder="+91 98765 43210" {...register('phone')} />
                </Field>
                <Field label="Institution" required error={errors.institution?.message}>
                  <Input placeholder="Institute of Technology" {...register('institution')} />
                </Field>
              </div>
              <Field label="Department (optional)">
                <Input placeholder="Computer Science & Engineering" {...register('department')} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2.5">
              {INTERESTS.map((tag) => {
                const selected = interests.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={cn(
                      'rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                      selected
                        ? 'border-transparent bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
              <p className="mt-2 w-full text-xs font-medium text-slate-400">{interests.length}/4 selected</p>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3">
              {ROLE_OPTIONS.map((r) => {
                const selected = selectedRole === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={cn(
                      'flex items-center gap-4 rounded-3xl border p-5 text-left transition-all duration-300',
                      selected
                        ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-50 to-blue-50 ring-2 ring-indigo-500/20 dark:border-indigo-400/50 dark:from-indigo-500/15 dark:to-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                    )}
                  >
                    <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition-all', selected ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                      <r.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className={cn('text-sm font-bold', selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100')}>{r.label}</p>
                      <p className="text-xs text-slate-400">
                        {r.value === 'student' && 'Courses, AI tutor, coding lab, career tools'}
                        {r.value === 'faculty' && 'Classes, question bank, AI teaching assistant'}
                        {r.value === 'parent' && 'Ward progress, insights, teacher communication'}
                        {r.value === 'admin' && 'Institution analytics, governance, AI config'}
                      </p>
                    </div>
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all', selected ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 dark:border-slate-600')}>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(s - 1, 1))}
          disabled={step === 1}
          className={step === 1 ? 'invisible' : ''}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button size="lg" onClick={next}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={finish}>
            <Sparkles className="h-4 w-4" /> Launch my workspace
          </Button>
        )}
      </div>
    </motion.div>
  )
}

export { ProfileSetup }
export default ProfileSetup
