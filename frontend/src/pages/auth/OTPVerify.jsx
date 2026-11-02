import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useResendOtp, useVerifyOtp, useRegisterVerifyOtp } from '@/services/auth'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/utils/cn'

function OTPVerify() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const purpose = location.state?.purpose ?? 'reset'
  const registerEmail = location.state?.email ?? null
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [resendIn, setResendIn] = useState(30)
  const refs = useRef([])
  const { mutateAsync: verify } = useVerifyOtp()
  const { mutateAsync: verifyRegister } = useRegisterVerifyOtp()
  const { mutateAsync: resend } = useResendOtp()
  const { login } = useAuth()

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const onSubmit = async () => {
    const otp = digits.join('')
    if (otp.length !== 6) {
      toast.error('Incomplete code', 'Please enter all 6 digits.')
      return
    }
    setLoading(true)
    try {
      if (purpose === 'register') {
        const data = await verifyRegister({ otp, email: registerEmail, purpose: 'register' })
        if (!data?.accessToken) {
          throw new Error('Registration did not return an access token')
        }
        await login({ session: data })
        toast.success('Account activated 🎉', 'Your student workspace is ready.')
        navigate('/student', { replace: true })
      } else {
        await verify({ otp, email: location.state?.email, purpose })
        toast.success('Code verified ✓', purpose === 'reset' ? 'Now choose a new password.' : 'Your email is verified.')
        navigate(purpose === 'reset' ? '/auth/reset-password' : '/auth/login', { state: { verified: true } })
      }
    } catch (err) {
      toast.error('Verification failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    const email = registerEmail ?? location.state?.email
    if (!email) {
      toast.error('Could not resend', 'Email is required to resend an OTP.')
      return
    }
    try {
      await resend({ email, purpose })
      setResendIn(30)
      toast.info('Code re-sent', 'Check your inbox for the new code.')
    } catch (err) {
      toast.error('Could not resend', err.message ?? 'Please try again.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-glow">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {purpose === 'register' ? 'Verify your email' : 'Verify your identity'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {purpose === 'register' ? (
          <>We sent a 6-digit code to <span className="font-semibold text-slate-700 dark:text-slate-200">{registerEmail ?? 'your email'}</span> to activate your account.</>
        ) : (
          <>Enter the 6-digit code we sent to your email {location.state?.email ? <span className="font-semibold text-slate-700 dark:text-slate-200">{location.state.email}</span> : 'on file'}.</>
        )}
      </p>

      <div className="mt-8 flex justify-between gap-2.5" role="group" aria-label="One-time password">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              if (text.length === 6) {
                e.preventDefault()
                setDigits(text.split(''))
                refs.current[5]?.focus()
              }
            }}
            inputMode="numeric"
            maxLength={1}
            className={cn(
              'h-14 w-full rounded-2xl border border-slate-200 bg-white text-center font-display text-xl font-bold text-slate-900 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white',
              'focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15',
              d && 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
            )}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <Button size="lg" className="mt-8 w-full" onClick={onSubmit} disabled={loading}>
        {loading ? 'Verifying…' : 'Verify code'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>

      <p className="mt-5 text-center text-sm text-slate-400">
        Didn’t receive it?{' '}
        {resendIn > 0 ? (
          <span className="font-semibold text-slate-500">Resend in {resendIn}s</span>
        ) : (
          <button onClick={onResend} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Resend code</button>
        )}
      </p>
      {purpose !== 'register' && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Verification code is sent to your email — enter the 6-digit code above to continue.
        </p>
      )}
    </motion.div>
  )
}

export { OTPVerify }
export default OTPVerify
