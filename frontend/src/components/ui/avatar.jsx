import { forwardRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'
import { avatarGradient } from '@/theme'

const Avatar = forwardRef(function Avatar({ className, name = '', src, size = 'md', gradient, ...props }, ref) {
  const [failed, setFailed] = useState(false)
  const sizes = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }
  const showImage = src && !failed
  return (
    <div
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-sm',
        sizes[size],
        className
      )}
      style={showImage ? undefined : { background: gradient || avatarGradient(name) }}
      {...props}
    >
      {showImage ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  )
})

const AvatarStack = forwardRef(function AvatarStack({ people = [], size = 'sm', max = 4, className }, ref) {
  const visible = people.slice(0, max)
  const rest = people.length - visible.length
  return (
    <div ref={ref} className={cn('flex -space-x-2.5', className)}>
      {visible.map((p, i) => (
        <div key={i} className="avatar-ring rounded-full">
          <Avatar name={p.name} src={p.src} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div className="avatar-ring flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          +{rest}
        </div>
      )}
    </div>
  )
})

export { Avatar, AvatarStack }
export default Avatar
