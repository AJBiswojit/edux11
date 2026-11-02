import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

function ProgressRing({ value = 0, size = 120, stroke = 10, color = '#6366f1', track = undefined, label, sublabel, className, animate = true }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (clamped / 100) * circumference
  const trackColor = track ?? 'rgba(100,116,139,0.12)'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : false}
          whileInView={animate ? { strokeDashoffset: offset } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined ? (
          <>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{label}</span>
            {sublabel && <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{sublabel}</span>}
          </>
        ) : (
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{Math.round(clamped)}%</span>
        )}
      </div>
    </div>
  )
}

export { ProgressRing }
export default ProgressRing
