import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import logoUrl from '@/assets/logo.png'

function LogoMark({ size = 34, className }) {
  return (
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[8px] object-contain', className)}
    />
  )
}

function Logo({ size = 34, withText = true, textClassName, markClassName, href, to }) {
  const content = (
    <>
      <LogoMark size={size} className={markClassName} />
      {withText && (
        <span className={cn('font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white', textClassName)}>
          MediXO <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">EduX</span>
        </span>
      )}
    </>
  )
  const cls = 'flex items-center gap-2.5'
  // `to` renders a router <Link> (avoids nesting <a> inside <a> when the
  // logo is placed inside navigation); otherwise fall back to a plain anchor.
  if (to) {
    return (
      <Link to={to} className={cls} aria-label="MediXO EduX home">
        {content}
      </Link>
    )
  }
  return (
    <a href={href ?? '/'} className={cls} aria-label="MediXO EduX home">
      {content}
    </a>
  )
}

export { Logo, LogoMark }
export default Logo
