import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, Lock, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui'
import { GradientText } from '@/components/shared/section-heading'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_HOME } from '@/config'

/**
 * 403 — Forbidden. Shown when a signed-in user reaches a route outside
 * their role. Offers a path back to their own portal.
 */
function Forbidden() {
  const { user } = useAuth()
  const location = useLocation()
  const role = user?.role
  const home = role ? ROLE_HOME[role] ?? '/' : '/'

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="bg-grid absolute inset-0 mask-fade-y opacity-50" />
        <div className="absolute left-1/3 top-1/4 h-72 w-72 animate-blob rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-72 w-72 animate-blob rounded-full bg-indigo-500/10 blur-3xl" style={{ animationDelay: '5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-glow">
          <ShieldX className="h-9 w-9" />
        </div>
        <p className="mt-6 font-display text-7xl font-bold leading-none tracking-tight text-slate-900/10 sm:text-8xl dark:text-white/10">
          403
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
          This area is <GradientText>off limits</GradientText>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {role ? (
            <>
              Your <span className="font-bold capitalize">{role}</span> account doesn't have access to{' '}
              <span className="font-mono text-xs">{location.pathname}</span>. If you believe this is a mistake, contact
              your institution administrator.
            </>
          ) : (
            'Sign in with a role that can access this area.'
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to={home}>
              <Home className="h-4 w-4" /> Go to my portal
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </Button>
        </div>
        {role && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
            <Lock className="h-3.5 w-3.5" /> Role-based access is enforced on every route.
          </p>
        )}
      </motion.div>
    </div>
  )
}

export { Forbidden }
export default Forbidden
