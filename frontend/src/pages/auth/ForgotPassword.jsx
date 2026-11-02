import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, KeyRound, MailCheck } from 'lucide-react'
import { Button, Field, Input, useToast } from '@/components/ui'
import { RULES } from '@/validators'
import { useForgotPassword } from '@/services/auth'

function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { mutateAsync, isPending } = useForgotPassword()
  const navigate = useNavigate()
  const toast = useToast()
  const [sent, setSent] = useState(false)

  const onSubmit = async (values) => {
    try {
      const res = await mutateAsync(values)
      setSent(true)
      toast.success('Reset link sent', res.message)
      setTimeout(() => navigate('/auth/verify-otp', { state: { email: values.email, purpose: 'reset' } }), 1200)
    } catch (err) {
      toast.error('Something went wrong', err.message)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-glow">
        {sent ? <MailCheck className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {sent ? 'Check your inbox' : 'Forgot your password?'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {sent
          ? 'We’ve sent a 6-digit OTP to your email. Use it on the next screen to reset your password safely.'
          : 'Enter the email linked to your account and we’ll send a secure one-time code to reset your password.'}
      </p>

      {!sent ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
          <Field label="Email address" required error={errors.email?.message}>
            <Input type="email" placeholder="you@institution.edu" autoComplete="email" {...register('email', RULES.email)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? 'Sending code…' : 'Send reset code'}
            {!isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <Button size="lg" className="mt-7 w-full" onClick={() => navigate('/auth/verify-otp', { state: { purpose: 'reset' } })}>
          Enter the OTP <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <p>A secure one-time code is sent to your registered email. It expires shortly and is tied to this request.</p>
      </div>
    </motion.div>
  )
}

export { ForgotPassword }
export default ForgotPassword
