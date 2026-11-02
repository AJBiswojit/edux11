import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { APP_CONFIG } from '@/config'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem(APP_CONFIG.THEME_KEY)
      if (saved === 'dark' || saved === 'light') return saved
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try {
      window.localStorage.setItem(APP_CONFIG.THEME_KEY, theme)
    } catch {
      /* noop */
    }
  }, [theme])

  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return window.localStorage.getItem('EduX_reduced_motion') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (reducedMotion) root.classList.add('reduced-motion')
    else root.classList.remove('reduced-motion')
    try {
      window.localStorage.setItem('EduX_reduced_motion', String(reducedMotion))
    } catch {
      /* noop */
    }
  }, [reducedMotion])

  const toggleReducedMotion = useCallback(() => setReducedMotion((v) => !v), [])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const setLight = useCallback(() => setTheme('light'), [])
  const setDark = useCallback(() => setTheme('dark'), [])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, setLight, setDark, reducedMotion, toggleReducedMotion }),
    [theme, toggleTheme, setLight, setDark, reducedMotion, toggleReducedMotion]
  )

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>{children}</MotionConfig>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeProvider
