import { useState } from 'react'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function Calendar({ month: controlledMonth, selected, onSelect, events = [], className, minDate }) {
  const [internalMonth, setInternalMonth] = useState(new Date())
  const month = controlledMonth ?? internalMonth
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })

  const navigate = (dir) => {
    const next = dir === 'next' ? addMonths(month, 1) : subMonths(month, 1)
    if (controlledMonth) onSelect?.('__navigate', next)
    else setInternalMonth(next)
  }

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => navigate('prev')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{format(month, 'MMMM yyyy')}</span>
        <button
          onClick={() => navigate('next')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const selectedDay = selected && isSameDay(day, selected)
          const today = isToday(day)
          const dayEvents = events.filter((e) => e.date && isSameDay(new Date(e.date), day))
          const disabled = minDate && day < minDate
          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                'relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs font-medium transition-all duration-200',
                !inMonth && 'text-slate-300 dark:text-slate-700',
                inMonth && !selectedDay && !today && 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-800',
                today && !selectedDay && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
                selectedDay && 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30',
                disabled && 'cursor-not-allowed opacity-40',
                dayEvents.length > 0 && !selectedDay && 'after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-teal-500'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
export default Calendar
