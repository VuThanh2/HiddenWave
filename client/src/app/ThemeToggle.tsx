import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { SegmentedControl } from '@/components/SegmentedControl'
import { useTheme, type ThemePreference } from '@/theme/theme-context'

const OPTIONS = [
  { value: 'light', label: <Sun className="size-3.5" aria-label="Sáng" /> },
  { value: 'dark', label: <Moon className="size-3.5" aria-label="Tối" /> },
  { value: 'system', label: <Monitor className="size-3.5" aria-label="Theo hệ thống" /> },
] satisfies { value: ThemePreference; label: ReactNode }[]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  return (
    <SegmentedControl
      aria-label="Giao diện"
      size="sm"
      value={preference}
      onChange={setPreference}
      options={OPTIONS}
    />
  )
}
