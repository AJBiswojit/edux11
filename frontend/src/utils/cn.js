import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names with conflict resolution (shadcn-style). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export default cn
