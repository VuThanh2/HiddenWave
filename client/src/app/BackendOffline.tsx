import { PlugZap, RotateCw } from 'lucide-react'
import { motion } from 'motion/react'

import { CopyButton } from '@/components/CopyButton'
import { Button } from '@/components/ui/button'

const COMMANDS = [
  { label: 'Khởi động engine', command: 'cd engine && uv run hiddenwave serve' },
  { label: 'Nếu đang phát triển giao diện, chạy thêm', command: 'cd client && npm run dev' },
]

export function BackendOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="w-full max-w-lg space-y-5 rounded-2xl border bg-card p-6 shadow-xl"
        role="alertdialog"
        aria-labelledby="offline-title"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <PlugZap className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 id="offline-title" className="text-lg font-semibold">
              Không kết nối được engine
            </h2>
            <p className="text-sm text-muted-foreground">
              Hãy khởi động engine trên máy này. Mọi dữ liệu chỉ được xử lý trên máy của bạn.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {COMMANDS.map(({ label, command }) => (
            <div key={command} className="space-y-1.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 py-1.5 pr-1.5 pl-3">
                <code className="min-w-0 flex-1 truncate font-mono text-xs">{command}</code>
                <CopyButton text={command} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <RotateCw className="size-3.5 animate-spin [animation-duration:2.5s]" />
            Đang tự thử kết nối lại…
          </span>
          <Button variant="outline" onClick={onRetry}>
            Thử lại ngay
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
