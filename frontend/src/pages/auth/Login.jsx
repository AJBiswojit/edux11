import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Bot, Eye, EyeOff, GraduationCap, HeartHandshake, LogIn, ShieldCheck } from 'lucide-react'
import { Button, Checkbox, Field, Input, useToast } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { RULES } from '@/validators'
import { ROLE_HOME, ROLES, FEATURE_FLAGS } from '@/config'
import { cn } from '@/utils/cn'

const ROLES_META = [
  { id: ROLES.STUDENT, label: 'Student', icon: GraduationCap, desc: 'Learn, practice, grow' },
  { id: ROLES.FACULTY, label: 'Faculty', icon: Bot, desc: 'Teach with AI superpowers' },
  { id: ROLES.PARENT, label: 'Parent', icon: HeartHandshake, desc: 'Stay close, without hovering' },
  { id: ROLES.ADMIN, label: 'Admin', icon: ShieldCheck, desc: 'Run the institution on data' },
]

/* Phase 27.2 (audit P2-7): while the Parent portal is feature-flagged off,
   the Parent role remains visible on the roadmap but cannot create a
   dead-end — selecting it shows a notice and the sign-in action is blocked. */
const parentDisabled = !FEATURE_FLAGS.parentPortal

function Login() {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({ defaultValues: { email: '', password: '', rememberMe: true } })
  const [role, setRole] = useState(ROLES.STUDENT)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const location = useLocation()

  const roleMeta = ROLES_META.find((r) => r.id === role)
  const isStudent = role === ROLES.STUDENT

  useEffect(() => {
    const fromQuery = params.get('role')
    if (fromQuery && ROLES_META.some((r) => r.id === fromQuery)) {
      setRole(fromQuery)
    }
  }, [params])

  // Clear the identifier field when switching roles to avoid a roll number
  // being submitted for a non-student role.
  useEffect(() => {
    setValue('email', '')
  }, [role, setValue])

  const onSubmit = async (values) => {
    if (role === ROLES.PARENT && parentDisabled) {
      toast.info('Parent portal — coming soon', 'The Parent/Guardian experience is not part of the current version. Try Student, Faculty or Admin.')
      return
    }
    setLoading(true)
    try {
      const user = await login({ email: values.email, password: values.password, role })
      toast.success(`Welcome back, ${user.firstName ?? 'friend'}!`, 'You’re all set.')
      const from = location.state?.from?.pathname
      navigate(from ?? ROLE_HOME[user.role], { replace: true })
    } catch (err) {
      toast.error('Sign in failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome to MediXO EduX</h1>
      {/* <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Sign in to continue your learning journey. New here?{' '}
        <Link to="/auth/register" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Create an account
        </Link>
      </p> */}

      {/* Role selector */}
      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {ROLES_META.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={cn(
              'group relative rounded-2xl border p-3.5 text-left transition-all duration-300',
              role === r.id
                ? 'border-indigo-400/70 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-card ring-2 ring-indigo-500/20 dark:border-indigo-400/50 dark:from-indigo-500/15 dark:to-blue-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300',
                  role === r.id ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                )}
              >
                <r.icon className="h-4 w-4" />
              </span>
              <span>
                <span className={cn('block text-sm font-bold', role === r.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>
                  {r.label}
                  {r.id === ROLES.PARENT && parentDisabled && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Coming soon</span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-400">{r.desc}</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Parent notice — no dead-ends (Phase 27.2) */}
      {role === ROLES.PARENT && parentDisabled && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
          <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
            <span className="font-bold">The Parent/Guardian portal is not part of the current version.</span>{' '}
            It is preserved in the codebase for the next release — for this demo, sign in as Student, Faculty or Admin instead.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        <Field label={isStudent ? 'Roll Number' : 'Email Address'} required error={errors.email?.message}>
          <Input
            type={isStudent ? 'text' : 'email'}
            placeholder={isStudent ? 'Enter Roll number' : 'Enter your email address'}
            autoComplete="username"
            {...register('email', isStudent ? RULES.email : RULES.emailOnly)}
          />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-12"
              {...register('password', RULES.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <Checkbox
            checked={watch('rememberMe')}
            onCheckedChange={(v) => setValue('rememberMe', v)}
            label="Remember me"
          />
          <Link to="/auth/forgot-password" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading || (role === ROLES.PARENT && parentDisabled)}>
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Sign in as {roleMeta.label}
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        By continuing you agree to MediXO EduX’s <Link to="/terms" className="font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">Terms</Link> and{' '}
        <Link to="/privacy" className="font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">Privacy Policy</Link>.
      </p>
    </motion.div>
  )
}

export { Login }
export default Login
