import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  label: ReactNode
  icon: LucideIcon
  onClick: () => void
  loading?: boolean
  loadingLabel?: ReactNode
  /** Lý do chưa bấm được; có giá trị thì nút bị vô hiệu và lý do hiện ngay bên dưới. */
  blockedReason?: string | null
  shortcut?: string
  className?: string
}

export function SubmitButton({
  label,
  icon: Icon,
  onClick,
  loading,
  loadingLabel,
  blockedReason,
  shortcut,
  className,
}: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        className="relative h-10 w-full overflow-hidden text-sm"
        onClick={onClick}
        disabled={Boolean(blockedReason) || loading}
      >
        {loading && (
          <span className="absolute inset-0 animate-pulse bg-linear-to-r from-transparent via-white/15 to-transparent" />
        )}
        {loading ? <LoaderCircle className="animate-spin" /> : <Icon />}
        {loading ? (loadingLabel ?? label) : label}
        {shortcut && !loading && (
          <kbd className="ml-1 hidden rounded border border-primary-foreground/25 px-1 font-sans text-[10px] opacity-70 sm:inline">
            {shortcut}
          </kbd>
        )}
      </Button>
      <AnimatePresence initial={false}>
        {blockedReason && !loading && (
          <motion.p
            key={blockedReason}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-center text-xs text-muted-foreground"
          >
            {blockedReason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
