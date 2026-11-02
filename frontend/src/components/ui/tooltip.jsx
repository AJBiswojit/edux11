import { useRef, useState } from 'react'
import { cn } from '@/utils/cn'

function Tooltip({ content, side = 'top', children, className }) {
  const [show, setShow] = useState(false)
  const wrapRef = useRef(null)

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[90] whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900',
            side === 'top' && 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
            side === 'bottom' && 'left-1/2 top-full mt-1.5 -translate-x-1/2',
            side === 'left' && 'right-full top-1/2 mr-1.5 -translate-y-1/2',
            side === 'right' && 'left-full top-1/2 ml-1.5 -translate-y-1/2',
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

const TooltipTrigger = Tooltip
const TooltipContent = ({ children }) => children

export { Tooltip, TooltipTrigger, TooltipContent }
export default Tooltip
