import { CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { motion } from 'motion/react'

import type { StegoMode } from '@/api/types'
import { CopyButton } from '@/components/CopyButton'
import { ModeBadge } from '@/components/ModeBadge'
import { formatInt } from '@/lib/format'
import { messageByteLength } from '@/lib/message'

export function DecodedMessage({ message, mode }: { message: string; mode: StegoMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="size-4 text-success" />
          Đã giải mã
          <ModeBadge mode={mode} />
        </div>
        <CopyButton text={message} />
      </div>

      <motion.pre
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-h-[28rem] overflow-auto rounded-xl border bg-muted/40 p-4 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap"
      >
        {message}
      </motion.pre>

      <div className="text-xs text-muted-foreground tabular">
        {formatInt([...message].length)} ký tự · {formatInt(messageByteLength(message))} byte
      </div>

      {mode === 'classic' ? (
        <div className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
          <span>
            Chế độ Classic không kiểm tra tính toàn vẹn: nếu thấy chuỗi lạ, có thể file không chứa
            message.
          </span>
        </div>
      ) : (
        <div className="flex gap-2 rounded-lg bg-hardened/10 px-3 py-2 text-xs">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-hardened" />
          <span>Message nguyên vẹn, đúng passphrase.</span>
        </div>
      )}
    </motion.div>
  )
}
