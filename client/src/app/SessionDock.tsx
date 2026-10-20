import { FileAudio, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { ModeBadge } from '@/components/ModeBadge'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSession, type FileRole } from '@/session/session-context'

const ROWS: { role: FileRole; label: string; tone: string }[] = [
  { role: 'cover', label: 'Cover', tone: 'text-cover' },
  { role: 'stego', label: 'Stego', tone: 'text-stego' },
]

export function SessionDock() {
  const session = useSession()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Phiên làm việc
        </span>
        <ModeBadge mode={session.mode} />
      </div>
      <div className="space-y-1">
        {ROWS.map(({ role, label, tone }) => {
          const entry = session[role]
          return (
            <div
              key={role}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-sidebar-accent/60"
            >
              <FileAudio
                className={cn('size-3.5 shrink-0', entry ? tone : 'text-muted-foreground/50')}
              />
              <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={entry?.file.name ?? 'empty'}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 flex-1 truncate"
                  title={entry ? `${entry.file.name} · ${formatBytes(entry.file.size)}` : undefined}
                >
                  {entry ? entry.file.name : <span className="text-muted-foreground/60">—</span>}
                </motion.span>
              </AnimatePresence>
              {entry && (
                <button
                  type="button"
                  onClick={() => session.clearFile(role)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                  aria-label={`Xoá ${label} khỏi phiên`}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
