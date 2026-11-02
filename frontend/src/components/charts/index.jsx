/**
 * MediXO EduX chart system — premium Recharts wrappers with theme awareness,
 * gradient fills, soft tooltips and consistent visual language.
 */
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'
import { CHART_COLORS } from '@/theme'
import { formatCompact } from '@/utils/format'

/* ---------- theme helpers ---------- */
export function useChartTheme() {
  const { isDark } = useTheme()
  return {
    grid: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.12)',
    tick: isDark ? '#64748b' : '#94a3b8',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
    tooltipLabel: isDark ? '#94a3b8' : '#64748b',
    cursor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.06)',
    isDark,
  }
}

function ChartTooltip({ active, payload, label, formatter, labelFormatter, colors = CHART_COLORS.palette }) {
  const t = useChartTheme()
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl border px-3.5 py-2.5 shadow-lift backdrop-blur-xl"
      style={{ background: t.tooltipBg, borderColor: t.tooltipBorder }}
    >
      {label !== undefined && (
        <p className="mb-1.5 text-xs font-semibold" style={{ color: t.tooltipLabel }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill || colors[i % colors.length] }} />
          <span style={{ color: t.tooltipText }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            {formatter ? formatter(entry.value, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------- Area trend ---------- */
export function AreaTrend({ data, xKey = 'label', series = [], height = 260, showGrid = true, colors, formatter, className }) {
  const t = useChartTheme()
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          {showGrid && <CartesianGrid stroke={t.grid} strokeDasharray="4 8" vertical={false} />}
          <XAxis dataKey={xKey} tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
          <YAxis tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: t.cursor, strokeWidth: 2 }} />
          {series.map((s, i) => {
            const color = (colors ?? CHART_COLORS.palette)[i % 8]
            const gid = `grad_${i}_${color.replace('#', '')}`
            return (
              <Area
                key={i}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gid})`}
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: t.tooltipBg }}
              >
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
              </Area>
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Bar chart ---------- */
export function BarCompare({ data, xKey = 'label', series = [], height = 260, radius = 8, formatter, stacked = false, className }) {
  const t = useChartTheme()
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4}>
          {<CartesianGrid stroke={t.grid} strokeDasharray="4 8" vertical={false} />}
          <XAxis dataKey={xKey} tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
          <YAxis tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: t.cursor }} />
          {series.map((s, i) => (
            <Bar
              key={i}
              dataKey={s.key}
              name={s.name}
              fill={(s.color ?? CHART_COLORS.palette[i % 8])}
              radius={radius}
              stackId={stacked ? 'stack' : undefined}
              maxBarSize={44}
              fillOpacity={0.92}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Line chart ---------- */
export function LineTrend({ data, xKey = 'label', series = [], height = 260, formatter, className }) {
  const t = useChartTheme()
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="4 8" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
          <YAxis tick={{ fill: t.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ stroke: t.cursor, strokeWidth: 2 }} />
          {series.map((s, i) => {
            const color = s.color ?? CHART_COLORS.palette[i % 8]
            return (
              <Line
                key={i}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: t.tooltipBg }}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Donut / Pie ---------- */
export function DonutChart({ data, dataKey = 'value', nameKey = 'name', height = 240, innerRadius = '62%', centerLabel, centerSub, className }) {
  const t = useChartTheme()
  return (
    <div className={`relative ${className ?? ''}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius={innerRadius}
            outerRadius="88%"
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
          >
            {(data ?? []).map((entry, i) => (
              <Cell key={i} fill={entry.color ?? CHART_COLORS.palette[i % 8]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{centerLabel}</span>
          {centerSub && <span className="text-xs font-medium text-slate-400">{centerSub}</span>}
        </div>
      )}
    </div>
  )
}

/* ---------- Radar ---------- */
export function RadarCompare({ data, angleKey = 'axis', series = [], height = 280, className }) {
  const t = useChartTheme()
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke={t.grid} />
          <PolarAngleAxis dataKey={angleKey} tick={{ fill: t.tick, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: t.tick, fontSize: 9 }} axisLine={false} tickCount={5} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s, i) => {
            const color = s.color ?? CHART_COLORS.palette[i % 8]
            return (
              <Radar
                key={i}
                dataKey={s.key}
                name={s.name}
                stroke={color}
                fill={color}
                fillOpacity={i === 0 ? 0.35 : 0.12}
                strokeWidth={2.2}
              />
            )
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, dataKey = 'value', color = CHART_COLORS.indigo, width = 110, height = 36 }) {
  const t = useChartTheme()
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#spark_${color.replace('#', '')})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Mini bar (tiny) ---------- */
export function MiniBars({ data, dataKey = 'value', color = CHART_COLORS.indigo, height = 40, className }) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Animated counter KPI ---------- */
export function AnimatedValue({ value, decimals = 0, duration = 1.4, className }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <CountUp target={value} decimals={decimals} duration={duration} />
    </motion.span>
  )
}

import { useEffect, useRef, useState } from 'react'
function CountUp({ target, decimals = 0, duration = 1.4 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setDisplay(from + (target - from) * eased)
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-IN')}</>
}

/* ---------- Heatmap (custom) ---------- */
export function HeatmapGrid({ weeks = 13, days = 7, values, getColor }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1.5">
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="grid gap-1.5">
          {Array.from({ length: days }).map((_, d) => {
            const v = values?.[w]?.[d]?.value ?? 0
            const color = getColor ? getColor(v) : v > 75 ? '#10b981' : v > 45 ? '#34d399' : v > 20 ? '#a7f3d0' : '#f1f5f9'
            return (
              <div
                key={d}
                className="aspect-square w-full rounded-md transition-transform duration-200 hover:scale-110"
                style={{ background: color }}
                title={`${v}%`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
