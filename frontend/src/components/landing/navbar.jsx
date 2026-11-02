import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { ArrowRight, ChevronDown, Menu, Moon, Sun } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Logo } from '@/components/shared/logo'
import { useTheme } from '@/contexts/theme-context'
import { Button } from '@/components/ui/button'
import { MEGA_MENU_PLATFORM, MEGA_MENU_AI, MEGA_MENU_RESOURCES, NAV_LINKS } from '@/datasets/platform/content.js'
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

function IconByName({ name, className }) {
  const Icon = LucideIcons[name] ?? LucideIcons.Circle
  return <Icon className={className} />
}

/* Menu registry: Platform → 3-col, AI Suite → 2-col, Resources → 2-col */
const MENU_DATA = {
  Platform: { items: MEGA_MENU_PLATFORM, cols: 3, width: 680 },
  'AI Suite': { items: MEGA_MENU_AI, cols: 3, width: 520 },
  Resources: { items: MEGA_MENU_RESOURCES, cols: 2, width: 440 },
}

function MegaMenu({ items, width, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ width }}
      className="absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lift backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
        {items.map((col) => (
          <div key={col.title} className="min-w-0">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{col.title}</p>
            <ul className="space-y-0.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to ?? '/about'}
                    onClick={onNavigate}
                    className="group flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-indigo-50/70 dark:hover:bg-indigo-500/10"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 transition-transform duration-200 group-hover:scale-110 dark:text-indigo-300">
                      <IconByName name={link.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 transition-colors group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
                        {link.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-400">{link.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-500 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-sm font-bold">See the platform in action</p>
          <p className="text-xs text-white/80">A 3-minute tour of MediXO EduX, tailored to your institution.</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0 bg-white text-indigo-700 hover:bg-indigo-50">
          <Link to="/contact" onClick={onNavigate}>Book a demo <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </motion.div>
  )
}

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState({})
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Click outside → close */
  useEffect(() => {
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  /* Escape → close */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setOpenMenu(null)
  }, [location.pathname])

  const isHome = location.pathname === '/'

  const scrollTo = useCallback((href) => {
    setOpenMenu(null)
    if (!isHome) {
      navigate(`/${href}`)
      return
    }
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }, [isHome, navigate])

  const toggleMenu = (label) => setOpenMenu((cur) => (cur === label ? null : label))

  return (
    <header
      ref={navRef}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'glass-nav shadow-soft' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo size={36} />

        {/* Desktop nav — click-driven, Escape + outside close, no hover flicker */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <div key={link.label} className="relative">
              <button
                onClick={() => (link.mega ? toggleMenu(link.label) : scrollTo(link.href))}
                aria-expanded={link.mega ? openMenu === link.label : undefined}
                aria-haspopup={link.mega ? 'menu' : undefined}
                className={cn(
                  'flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
                  openMenu === link.label
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                {link.label}
                {link.mega && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', openMenu === link.label && 'rotate-180')} />}
              </button>
              <AnimatePresence>
                {openMenu === link.label && link.mega && (
                  <MegaMenu
                    items={MENU_DATA[link.label].items}
                    width={MENU_DATA[link.label].width}
                    onNavigate={() => setOpenMenu(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <Link
            to="/auth/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-600 sm:block dark:text-slate-200 dark:hover:text-indigo-300"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/auth/login?role=admin">
              Book a demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2.5 text-slate-600 lg:hidden dark:text-slate-300"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile menu — expandable sections, touch friendly, no desktop mega menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="p-0">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">MediXO EduX</SheetTitle>
            <SheetClose />
          </SheetHeader>
          <SheetBody>
            <nav className="space-y-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => {
                const expanded = mobileExpanded[link.label]
                const menuItems = link.mega ? MENU_DATA[link.label].items : null
                return (
                  <div key={link.label}>
                    <button
                      onClick={() => {
                        if (link.mega) {
                          setMobileExpanded((m) => ({ ...m, [link.label]: !expanded }))
                        } else {
                          setMobileOpen(false)
                          scrollTo(link.href)
                        }
                      }}
                      aria-expanded={link.mega ? !!expanded : undefined}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10"
                    >
                      {link.label}
                      {link.mega && <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />}
                    </button>
                    <AnimatePresence>
                      {expanded && menuItems && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1 py-1 pl-4">
                            {menuItems.map((col) => (
                              <div key={col.title}>
                                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{col.title}</p>
                                {col.links.map((l) => (
                                  <Link
                                    key={l.label}
                                    to={l.to ?? '/about'}
                                    onClick={() => { setMobileOpen(false); setOpenMenu(null) }}
                                    className="flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                  >
                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                                      <IconByName name={l.icon} className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">{l.label}</span>
                                      <span className="block text-[11px] leading-snug text-slate-400">{l.desc}</span>
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </nav>
            <div className="mt-6 space-y-2.5">
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">Sign in</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to="/contact">
                  Book a demo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </header>
  )
}

export { LandingNavbar }
export default LandingNavbar
