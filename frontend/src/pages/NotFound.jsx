import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Compass, Home, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { GradientText } from '@/components/shared/section-heading'

function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="bg-grid absolute inset-0 mask-fade-y opacity-50" />
        <div className="absolute left-1/4 top-1/4 h-72 w-72 animate-blob rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 animate-blob rounded-full bg-teal-400/15 blur-3xl" style={{ animationDelay: '5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <p className="font-display text-[120px] font-bold leading-none tracking-tight text-slate-900/10 sm:text-[160px] dark:text-white/10">
          404
        </p>
        <div className="-mt-16 flex flex-col items-center sm:-mt-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-glow">
            <Compass className="h-9 w-9" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
            This page wandered off <GradientText>the learning path</GradientText>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            The page you're looking for doesn't exist or has moved. Even the AI tutor can't find it — but it can help you get back on track.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/"><Home className="h-4 w-4" /> Back to home</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth/login"><ArrowLeft className="h-4 w-4" /> Go to sign in</Link>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Tip: use Ctrl+K to search anything from anywhere.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export { NotFound }
export default NotFound
