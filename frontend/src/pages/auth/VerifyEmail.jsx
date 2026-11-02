import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MailCheck, RefreshCw } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useVerifyEmail, useResendOtp } from '@/services/auth'
import { cn } from '@/utils/cn'

function VerifyEmail() {
  const navigate = useNavigate()
  const toast = useToast()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(30)
  const refs = useRef([])
  const { mutateAsync: verify } = useVerifyEmail()
  const { mutateAsync: resend } = useResendOtp()

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = clean
      return next
    })
    if (clean && i < 5) refs.current[i + 1]?.focus()
  }

  const onSubmit = async () => {
    const otp = digits.join('')
    if (otp.length !== 6) {
      toast.error('Incomplete code', 'Please enter all 6 digits.')
      return
    }
    setLoading(true)
    try {
      await verify({ otp })
      toast.success('Email verified 🎉', 'Your account is fully active now.')
      navigate('/auth/profile-setup')
    } catch (err) {
      toast.error('Verification failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    try {
      await resend()
      setResendIn(30)
      toast.info('Code re-sent', 'Check your inbox for the new code.')
    } catch {
      toast.error('Could not resend', 'Please try again.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-emerald">
        <MailCheck className="h-7 w-7" />
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl" style={{ animationDuration: '2.4s' }} />
      </div>
      <h1 className="mt-6 text-center font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Verify your email</h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        We sent a 6-digit code to your inbox. Enter it below to activate your account — it takes 10 seconds.
      </p>

      <div className="mt-8 flex justify-between gap-2.5" role="group" aria-label="Email verification code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            inputMode="numeric"
            maxLength={1}
            className={cn(
              'h-14 w-full rounded-2xl border border-slate-200 bg-white text-center font-display text-xl font-bold text-slate-900 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white',
              'focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15',
              d && 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10'
            )}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <Button size="lg" className="mt-8 w-full" onClick={onSubmit} disabled={loading}>
        {loading ? 'Verifying…' : 'Verify & continue'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
        <RefreshCw className="h-3.5 w-3.5" />
        {resendIn > 0 ? (
          <span>Resend code in <span className="font-bold text-slate-500">{resendIn}s</span></span>
        ) : (
          <button onClick={onResend} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Resend code</button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        A verification code was sent to your email — enter the 6-digit code above to continue.
      </p>
    </motion.div>
  )
}

export { VerifyEmail }
export default VerifyEmail
