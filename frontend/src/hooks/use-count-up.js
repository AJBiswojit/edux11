import { useEffect, useRef, useState } from 'react'

/**
 * Animated counter that eases to `target` when `start` becomes true.
 * Uses requestAnimationFrame with an ease-out cubic curve.
 */
export function useCountUp(target, { duration = 1800, start = true, decimals = 0 } = {}) {
  const [value, setValue] = useState(0)
  const frame = useRef()

  useEffect(() => {
    if (!start) return undefined
    const from = 0
    const delta = target - from
    const t0 = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(from + delta * eased)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration, start])

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN')
}

export default useCountUp
