import { Check } from 'lucide-react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

const STEPS = ['Thiết lập', 'Nghe & chọn', 'Kết quả']

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-2">
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.08 : 1 }}
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-xs font-semibold transition-colors duration-300',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary ring-4 ring-primary/15',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </motion.span>
              <span
                className={cn(
                  'hidden text-sm sm:inline',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span className="relative h-px flex-1 overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-0 origin-left bg-primary"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
