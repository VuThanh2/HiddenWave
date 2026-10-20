import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import { ThemeContext, type ThemePreference } from './theme-context'

const STORAGE_KEY = 'hiddenwave.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage bị chặn: dùng mặc định.
  }
  return 'system'
}

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const prefersDark = useSyncExternalStore(subscribeSystemTheme, systemPrefersDark)
  const theme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Không lưu được thì chỉ mất lựa chọn ở lần mở sau.
    }
  }, [preference])

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
