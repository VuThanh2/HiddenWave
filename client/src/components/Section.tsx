import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  step?: number
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ step, title, description, aside, children, className }: Props) {
  return (
    <section className={cn('rounded-2xl border bg-card/80 p-4 shadow-xs sm:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {step !== undefined && (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary tabular">
              {step}
            </span>
          )}
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
