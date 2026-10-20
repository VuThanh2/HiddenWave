import { AlertCircle, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

import type { ApiError } from '@/api/client'
import { errorCopy } from '@/api/errorCopy'
import { cn } from '@/lib/utils'

interface Props {
  error: ApiError | null | undefined
  /** Ghi đè tiêu đề/gợi ý mặc định theo ngữ cảnh màn hình. */
  title?: string
  hint?: ReactNode
  icon?: LucideIcon
  className?: string
}

export function ErrorNotice({ error, title, hint, icon: Icon = AlertCircle, className }: Props) {
  const copy = error ? errorCopy(error.code) : null
  return (
    <AnimatePresence initial={false}>
      {error && copy && (
        <motion.div
          key={`${error.code}:${error.message}`}
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="alert"
          className={cn(
            'flex gap-3 rounded-xl border border-destructive/30 bg-destructive/6 p-3 text-sm',
            className,
          )}
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-destructive">{title ?? copy.title}</p>
            {(hint ?? copy.hint) && (
              <div className="text-muted-foreground">{hint ?? copy.hint}</div>
            )}
            {copy.showDetail && (
              <p className="text-xs break-words text-muted-foreground/80">
                Chi tiết: {error.message}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
