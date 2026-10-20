import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

// Khớp MAX_SWEEP_RATES của API.
export const MAX_RATES = 12
const PRESET_PERCENTS = [1, 2, 5, 10, 20, 25, 30, 40, 50, 60, 75, 90, 100]

interface Props {
  /** Phần trăm (0, 100], đã sắp xếp tăng dần. */
  value: number[]
  onChange: (percents: number[]) => void
  disabled?: boolean
}

export function RatePicker({ value, onChange, disabled }: Props) {
  const [custom, setCustom] = useState('')
  const full = value.length >= MAX_RATES
  const options = [...new Set([...PRESET_PERCENTS, ...value])].sort((a, b) => a - b)

  const toggle = (percent: number) => {
    if (value.includes(percent)) onChange(value.filter((item) => item !== percent))
    else if (!full) onChange([...value, percent].sort((a, b) => a - b))
  }

  const customPercent = Number(custom.replace(',', '.'))
  const customValid = custom !== '' && customPercent > 0 && customPercent <= 100

  const addCustom = () => {
    if (!customValid || full) return
    const rounded = Math.round(customPercent * 100) / 100
    if (!value.includes(rounded)) onChange([...value, rounded].sort((a, b) => a - b))
    setCustom('')
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {options.map((percent) => {
            const selected = value.includes(percent)
            return (
              <motion.button
                layout
                key={percent}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => toggle(percent)}
                disabled={disabled || (!selected && full)}
                aria-pressed={selected}
                className={cn(
                  'h-7 rounded-full border px-2.5 text-xs font-medium tabular transition-colors disabled:opacity-40',
                  selected
                    ? 'border-primary/50 bg-primary/12 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                )}
              >
                {formatNumber(percent)}%
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && addCustom()}
          inputMode="decimal"
          placeholder="Mức khác (%)"
          className="h-7 w-32 text-xs"
          disabled={disabled || full}
          aria-invalid={(custom !== '' && !customValid) || undefined}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addCustom}
          disabled={disabled || full || !customValid}
        >
          <Plus /> Thêm
        </Button>
        <span
          className={cn('ml-auto text-xs tabular', full ? 'text-warning' : 'text-muted-foreground')}
        >
          {value.length}/{MAX_RATES} mức
        </span>
      </div>
    </div>
  )
}
