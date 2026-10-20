import type { StegoMode } from '@/api/types'
import { MODE_META } from '@/lib/modes'
import { cn } from '@/lib/utils'

const TONES: Record<StegoMode, string> = {
  classic: 'bg-classic/12 text-classic ring-classic/25',
  hardened: 'bg-hardened/12 text-hardened ring-hardened/25',
}

export function ModeBadge({ mode, className }: { mode: StegoMode; className?: string }) {
  const { icon: Icon, label } = MODE_META[mode]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium ring-1 ring-inset',
        TONES[mode],
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}
