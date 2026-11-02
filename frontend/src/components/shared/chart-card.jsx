import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/utils/cn'

function ChartCard({ title, subtitle, actions, children, className, contentClassName, headerExtra }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || actions || headerExtra) && (
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            {headerExtra}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn('pt-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export { ChartCard }
export default ChartCard
