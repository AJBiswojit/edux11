import { useEffect, useRef, useState } from 'react'

/**
 * IntersectionObserver hook for scroll-reveal animations.
 * Returns [ref, inView] — attach ref to the element to observe.
 */
export function useInView(options = { threshold: 0.15, rootMargin: '0px 0px -40px 0px', once: true }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (options.once) observer.unobserve(entry.target)
      } else if (!options.once) {
        setInView(false)
      }
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [ref, inView]
}

export default useInView
