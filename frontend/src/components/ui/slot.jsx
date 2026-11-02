import { Children, cloneElement, forwardRef, isValidElement } from 'react'
import { cn } from '@/utils/cn'

/**
 * Radix-style Slot: merges className/props onto a single child element,
 * enabling `asChild` composition (e.g. Button asChild -> Link).
 */
const Slot = forwardRef(function Slot({ children, className, ...props }, ref) {
  if (!isValidElement(children)) {
    return null
  }
  const child = Children.only(children)
  return cloneElement(child, {
    ...props,
    ...child.props,
    ref: (node) => {
      if (typeof child.ref === 'function') child.ref(node)
      if (ref) {
        if (typeof ref === 'function') ref(node)
        else ref.current = node
      }
    },
    className: cn(className, child.props.className),
  })
})

export { Slot }
export default Slot
