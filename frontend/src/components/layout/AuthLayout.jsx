import { Link, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { useTheme } from '@/contexts/theme-context'
import { Moon, Sun } from 'lucide-react'

const TESTIMONIAL = {
  quote: 'MediXO EduX is the first platform that genuinely personalises learning at the pace of 12,480 students. Our pass rates are up 19% in two semesters.',
  name: 'Dr. Anil Menon',
  role: 'Vice Chancellor, Quantum University',
}

function AuthLayout() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <div className="relative flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-teal-950" />
          <div className="bg-grid absolute inset-0 opacity-20" />
          <div className="absolute left-1/4 top-1/4 h-80 w-80 animate-blob rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 animate-blob rounded-full bg-teal-500/20 blur-3xl" style={{ animationDelay: '5s' }} />
        </div>

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo size={40} withText={false} />
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-400">Loved by 850+ institutions</span>
            </motion.div>
            <motion.blockquote
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-lg"
            >
              <p className="font-display text-2xl font-semibold leading-relaxed text-white">“{TESTIMONIAL.quote}”</p>
              <footer className="mt-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-400 text-sm font-bold text-white">
                  AM
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{TESTIMONIAL.name}</p>
                  <p className="text-xs text-slate-400">{TESTIMONIAL.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-teal-400" /> AI included</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> DPDP & GDPR ready</span>
            <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-blue-400" /> 99.9% uptime SLA</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
          <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between p-5 sm:p-7">
          <Logo size={32} to="/" />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              <Link to="/contact" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">Need help? Contact support</Link>
            </span>
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
        <div id="main-content" tabIndex={-1} className="relative flex flex-1 items-center justify-center px-4 pb-12 outline-none sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export { AuthLayout }
export default AuthLayout
