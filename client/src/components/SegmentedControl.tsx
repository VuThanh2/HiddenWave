import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'default',
  className,
  ...aria
}: Props<T>) {
  const indicatorId = useId()
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex rounded-lg bg-muted p-0.5 text-sm', className)}
      {...aria}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-foreground/5 dark:bg-input/40"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
