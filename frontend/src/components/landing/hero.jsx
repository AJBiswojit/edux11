import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  ArrowRight, BrainCircuit, CheckCircle2, GraduationCap, LineChart,
  PlayCircle, ShieldCheck, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HERO_METRICS } from '@/datasets/platform/content.js'
import { useCountUp } from '@/hooks/use-count-up'
import { useInView } from '@/hooks/use-in-view'

/* ---------- Animated metric counter ---------- */
function HeroMetric({ value, suffix, label, decimals = 0, index }) {
  const [ref, inView] = useInView()
  const count = useCountUp(value, { start: inView, duration: 1800, decimals })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.5 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      <p className="font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        {count}
        <span className="text-gradient">{suffix}</span>
      </p>
      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
    </motion.div>
  )
}

/* ---------- Mouse-follow glow for the background ---------- */
function useMouseGlow() {
  const ref = useRef(null)
  const mx = useMotionValue(-400)
  const my = useMotionValue(-400)
  const sx = useSpring(mx, { stiffness: 60, damping: 20 })
  const sy = useSpring(my, { stiffness: 60, damping: 20 })
  const onMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set(e.clientX - rect.left)
    my.set(e.clientY - rect.top)
  }
  const glowX = useTransform(sx, (v) => v - 240)
  const glowY = useTransform(sy, (v) => v - 240)
  return { ref, onMouseMove, glowX, glowY }
}

/* ---------- Gentle parallax for the showcase card ---------- */
function useHeroParallax() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 55, damping: 16 })
  const sy = useSpring(my, { stiffness: 55, damping: 16 })
  const x = useTransform(sx, [-0.5, 0.5], [12, -12])
  const y = useTransform(sy, [-0.5, 0.5], [9, -9])
  const onMouseMove = (e) => {
    const rect = e.currentTarget?.getBoundingClientRect?.()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  return { x, y, onMouseMove }
}

/* ---------- Floating particles ---------- */
const PARTICLES = [
  { left: '12%', top: '22%', size: 4, delay: 0, duration: 7 },
  { left: '22%', top: '70%', size: 3, delay: 1.2, duration: 9 },
  { left: '66%', top: '16%', size: 5, delay: 0.6, duration: 8 },
  { left: '84%', top: '58%', size: 3, delay: 2, duration: 10 },
  { left: '42%', top: '82%', size: 4, delay: 1.6, duration: 7.5 },
  { left: '92%', top: '30%', size: 3, delay: 0.3, duration: 8.5 },
]

/* ---------- Trust indicators ---------- */
const TRUST = [
  { icon: BrainCircuit, label: 'AI-Powered Academic Intelligence' },
  { icon: GraduationCap, label: 'Built for Schools, Colleges & Coaching Institutes' },
  { icon: LineChart, label: 'Exam Analytics & Academic Intelligence' },
  { icon: ShieldCheck, label: 'Secure Cloud Platform' },
]

/* ---------- Hero showcase — attached image as premium glass card ---------- */
function HeroShowcase() {
  const { x, y, onMouseMove } = useHeroParallax()

  return (
    <div
      className="relative"
      onMouseMove={onMouseMove}
      style={{ perspective: 1200 }}
    >
      {/* Ambient glow behind the card */}
      <div
        className="absolute -inset-8 rounded-[44px] bg-gradient-to-br from-indigo-500/30 via-blue-500/20 to-teal-400/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -inset-4 rounded-[40px] bg-blue-500/15 blur-2xl"
        aria-hidden="true"
      />

      <motion.div
        style={{ x, y, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 44, rotateX: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative animate-float-slow"
      >
        {/* Gradient ring frame */}
        <div className="rounded-[30px] bg-gradient-to-br from-indigo-400/70 via-blue-400/30 to-teal-400/70 p-[1.5px] shadow-lift">
          <div className="relative overflow-hidden rounded-[28px] bg-white/90 p-2.5 backdrop-blur-2xl dark:bg-slate-900/85">
            {/* Glass sheen overlay — never covers the image content */}
            <div
              className="pointer-events-none absolute inset-2.5 z-10 rounded-[20px] bg-gradient-to-b from-white/10 via-transparent to-white/5"
              aria-hidden="true"
            />
            <img
              src="/hero-showcase.webp"
              alt="MediXO EduX — AI-Powered Academic Intelligence Platform preview"
              className="relative z-0 h-auto w-full rounded-[20px] object-cover"
              width={1536}
              height={1024}
            />
            {/* Inner rim light */}
            <div
              className="pointer-events-none absolute inset-2.5 rounded-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Floating status chip (on the frame, not the image) */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -right-4 top-8 hidden animate-float rounded-2xl border border-white/60 bg-white/85 px-3.5 py-2 shadow-lift backdrop-blur-xl sm:block dark:border-white/10 dark:bg-slate-900/85"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">AI Academic Intelligence</span>
          </div>
        </motion.div>

        {/* Floating percentile chip (frame accent) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-5 left-8 hidden animate-float-slow rounded-2xl border border-white/60 bg-white/85 px-4 py-2.5 shadow-lift backdrop-blur-xl sm:block dark:border-white/10 dark:bg-slate-900/85"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Exam Intelligence</p>
          <p className="font-display text-base font-bold text-slate-900 dark:text-white">
            91.4 <span className="text-gradient">percentile</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ---------- Hero ---------- */
function Hero() {
  const { ref, onMouseMove, glowX, glowY } = useMouseGlow()

  return (
    <section className="relative overflow-hidden pt-[72px]" onMouseMove={onMouseMove} ref={ref}>
      {/* Animated background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-grid mask-fade-y opacity-60" />
        <div className="absolute -top-24 left-[8%] h-96 w-96 animate-blob rounded-full bg-indigo-500/20 blur-3xl" style={{ animationDelay: '0s' }} />
        <div className="absolute right-[4%] top-24 h-80 w-80 animate-blob rounded-full bg-teal-400/20 blur-3xl" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-blue-500/15 blur-3xl" style={{ animationDelay: '8s' }} />
        <div className="absolute bottom-10 right-[28%] h-64 w-64 animate-blob rounded-full bg-sky-400/15 blur-3xl" style={{ animationDelay: '6s' }} />
        {/* mouse-follow glow */}
        <motion.div
          className="pointer-events-none absolute h-[480px] w-[480px] rounded-full bg-gradient-to-br from-indigo-500/12 via-blue-500/8 to-teal-400/12 blur-3xl"
          style={{ left: glowX, top: glowY }}
        />
        {/* subtle glowing particles */}
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-indigo-400/50 dark:bg-indigo-300/40"
            style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
            animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <motion.span
          className="absolute left-[78%] top-[14%] h-10 w-10 rounded-full bg-indigo-400/20 blur-md"
          animate={{ y: [0, -24, 0], opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* Left — copy */}
          <div>
            {/* Feature badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-md dark:border-indigo-500/30 dark:bg-slate-900/70 dark:text-indigo-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Introducing MediXO Mentor 4.0
              <span className="rounded-full bg-gradient-to-r from-indigo-600 to-teal-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 font-display text-[42px] font-bold leading-[1.06] tracking-tight text-slate-900 sm:text-6xl lg:text-[64px] dark:text-white"
            >
              Learn Smarter.
              <br />
              <span className="text-gradient">Achieve Greater.</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400"
            >
              MediXO EduX unifies <span className="font-semibold text-slate-700 dark:text-slate-200">Artificial Intelligence</span>,{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Academic Analytics</span>,{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Exam Intelligence</span>, Performance Tracking
              and Personalized Learning into one intelligent platform — purpose-built for schools, colleges, universities,
              and JEE &amp; NEET coaching institutes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <Button asChild size="lg" className="group">
                <Link to="/auth/login?role=admin">
                  Explore MediXO EduX
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="glass" className="group">
                <Link to="/contact">
                  <PlayCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  Book a Live Demo
                </Link>
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-2">
              {TRUST.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.55 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-white/60 px-3.5 py-2.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/30"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/20 transition-transform duration-300 group-hover:scale-110 dark:text-indigo-300">
                    <t.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-semibold leading-snug text-slate-600 dark:text-slate-300">{t.label}</span>
                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — attached image showcase */}
          <HeroShowcase />
        </div>

        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-20 grid grid-cols-2 gap-8 rounded-3xl border border-slate-200/60 bg-white/60 p-8 backdrop-blur-xl sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/50"
        >
          {HERO_METRICS.map((m, i) => (
            <HeroMetric key={m.label} {...m} index={i} />
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.a
          href="#platform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="group mx-auto mt-14 flex w-fit flex-col items-center gap-2 text-slate-400 transition-colors hover:text-indigo-500 dark:text-slate-500"
          aria-label="Scroll to explore"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Explore</span>
          <span className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-current p-1">
            <motion.span
              animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-current"
            />
          </span>
        </motion.a>
      </div>
    </section>
  )
}

export { Hero }
export default Hero
