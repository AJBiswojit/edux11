import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock } from 'lucide-react'
import { Button, Field, Input, useToast } from '@/components/ui'
import { RULES } from '@/validators'
import { useResetPassword } from '@/services/auth'
import { validateConfirmPassword } from '@/validators'

function ResetPassword() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const { mutateAsync, isPending } = useResetPassword()
  const navigate = useNavigate()
  const toast = useToast()
  const [show, setShow] = useState({ p1: false, p2: false })
  const password = watch('password')

  const onSubmit = async (values) => {
    try {
      const res = await mutateAsync({ password: values.password })
      toast.success('Password updated ✓', res.message)
      navigate('/auth/login')
    } catch (err) {
      toast.error('Reset failed', err.message)
    }
  }

  const strength = !password ? 0 : password.length >= 12 ? 3 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 2 : 1

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-glow">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Set a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Choose a strong password you haven’t used for this account before. Minimum 8 characters with an uppercase letter and a number.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        <Field label="New password" required error={errors.password?.message}>
          <div className="relative">
            <Input
              type={show.p1 ? 'text' : 'password'}
              placeholder="At least 8 characters"
              className="pr-12"
              {...register('password', RULES.strongPassword)}
            />
            <button
              type="button"
              onClick={() => setShow({ ...show, p1: !show.p1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Toggle password visibility"
            >
              {show.p1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${s <= strength ? (strength === 3 ? 'bg-emerald-500' : strength === 2 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {strength === 3 ? 'Strong' : strength === 2 ? 'Good' : 'Weak'}
              </span>
            </div>
          )}
        </Field>
        <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
          <div className="relative">
            <Input
              type={show.p2 ? 'text' : 'password'}
              placeholder="Repeat the new password"
              className="pr-12"
              {...register('confirmPassword', { validate: (v) => validateConfirmPassword(v, password) })}
            />
            <button
              type="button"
              onClick={() => setShow({ ...show, p2: !show.p2 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Toggle password visibility"
            >
              {show.p2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? 'Updating…' : 'Update password'}
          {!isPending && <Lock className="h-4 w-4" />}
        </Button>
      </form>
    </motion.div>
  )
}

export { ResetPassword }
export default ResetPassword
