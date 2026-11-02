import { cn } from '@/utils/cn'

function Skeleton({ className, ...props }) {
  return <div className={cn('shimmer rounded-xl', className)} {...props} />
}

export { Skeleton }
export default Skeleton
