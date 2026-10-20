import { cn } from '@/lib/utils'

import { VERDICT_COPY, type Verdict } from './verdict'

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const copy = VERDICT_COPY[verdict]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
        copy.tone,
        className,
      )}
    >
      {copy.label}
    </span>
  )
}
