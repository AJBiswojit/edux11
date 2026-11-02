/**
 * MediXO EduX — Faculty Command Center · 7. Course Progress.
 * Premium progress indicators per course — completion, subject, chapters,
 * teaching, revision and lab progress — all derived.
 */

import { ChartCard } from '@/components/shared/chart-card'

function CourseProgress() {
  return (
    <ChartCard
      title="Course progress"
      subtitle="Completion · teaching · revision · chapters · labs"
      className="h-full"
    >
      <div className="flex min-h-[220px] items-center justify-center">
        <span className="rounded-full bg-indigo-50 px-3.5 py-1.5 text-sm font-bold tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20">Coming Soon</span>
      </div>
    </ChartCard>
  )
}

export { CourseProgress }
export default CourseProgress
