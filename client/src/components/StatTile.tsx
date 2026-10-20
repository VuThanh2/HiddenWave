import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: LucideIcon
  className?: string
  emphasis?: boolean
}

export function StatTile({ label, value, sub, icon: Icon, className, emphasis }: Props) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl border bg-card/60 p-3.5',
        emphasis && 'bg-linear-to-br from-primary/8 to-transparent',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="truncate text-xl font-semibold tracking-tight tabular">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}
