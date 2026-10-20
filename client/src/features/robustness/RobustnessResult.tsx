import { ArrowRight, CheckCircle2, FileAudio, FileX2, Music } from 'lucide-react'
import { motion } from 'motion/react'

import type { RobustnessResponse, StegoMode } from '@/api/types'
import { ModeBadge } from '@/components/ModeBadge'
import { StatTile } from '@/components/StatTile'
import { formatInt, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

const FAILURE_LABEL: Record<string, string> = {
  message_not_found: 'Không tìm thấy message',
  authentication_failed: 'Không giải mã được — dữ liệu đã bị hỏng',
  invalid_wav: 'File sau khi nén không đọc được',
}

const PIPELINE = [
  { label: 'File stego', icon: FileAudio },
  { label: 'Nén MP3', icon: Music },
  { label: 'WAV trở lại', icon: FileAudio },
]

interface Props {
  result: RobustnessResponse
  mode: StegoMode
}

export function RobustnessResult({ result, mode }: Props) {
  const recovered = result.recovered
  const sampleDelta = result.samples_after - result.samples_before

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
      className="space-y-5"
    >
      <Pipeline />

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.45, type: 'spring', bounce: 0.3 }}
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-4',
          recovered ? 'border-success/30 bg-success/8' : 'border-destructive/30 bg-destructive/6',
        )}
      >
        {recovered ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <FileX2 className="mt-0.5 size-5 shrink-0 text-destructive" />
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            {recovered ? 'Message vẫn còn sau khi nén MP3' : 'Message đã mất sau khi nén MP3'}
            <ModeBadge mode={mode} />
          </div>
          <p className="text-sm text-muted-foreground">
            {recovered
              ? 'Điều này khá bất thường vì nén MP3 thường làm mất tin giấu.'
              : 'Đúng như dự đoán: nén MP3 làm thay đổi dữ liệu âm thanh nên tin giấu bị mất.'}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-2">
        <MessagePanel title="Trước khi nén" tone="ok" text={result.original_message} />
        <MessagePanel
          title="Sau khi nén"
          tone={recovered ? 'ok' : 'lost'}
          text={result.recovered_message}
          failure={
            result.recovered_message === null
              ? (FAILURE_LABEL[result.failure_code ?? ''] ??
                result.failure_code ??
                'Không giải mã được')
              : !recovered
                ? 'Ra một chuỗi khác với message gốc'
                : undefined
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <LsbAgreement value={result.lsb_agreement} />
        <StatTile
          label="Số mẫu trước → sau khi nén"
          value={`${formatInt(result.samples_before)} → ${formatInt(result.samples_after)}`}
          sub={
            sampleDelta === 0
              ? 'Không đổi'
              : `${sampleDelta > 0 ? '+' : ''}${formatInt(sampleDelta)} mẫu do MP3 thêm khoảng lặng`
          }
        />
      </div>
    </motion.div>
  )
}

function Pipeline() {
  return (
    <div className="flex items-center justify-center gap-1 overflow-x-auto py-1 sm:gap-3">
      {PIPELINE.map((step, index) => (
        <div key={step.label} className="flex items-center gap-1 sm:gap-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium whitespace-nowrap"
          >
            <step.icon className="size-3.5 text-primary" />
            {step.label}
          </motion.div>
          {index < PIPELINE.length - 1 && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 + 0.1 }}
            >
              <ArrowRight className="size-4 text-muted-foreground" />
            </motion.span>
          )}
        </div>
      ))}
    </div>
  )
}

interface MessagePanelProps {
  title: string
  tone: 'ok' | 'lost'
  text: string | null
  failure?: string
}

function MessagePanel({ title, tone, text, failure }: MessagePanelProps) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border p-4',
        tone === 'lost' ? 'border-destructive/25' : 'border-border',
      )}
    >
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {failure && <div className="text-sm font-medium text-destructive">{failure}</div>}
      {text !== null && (
        <pre className="max-h-48 overflow-auto rounded-lg bg-muted/40 p-3 font-sans text-sm break-words whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  )
}

function LsbAgreement({ value }: { value: number | null }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card/60 p-3.5">
      <div className="text-xs text-muted-foreground">Dữ liệu giấu còn giữ được</div>
      <div className="text-xl font-semibold tracking-tight tabular">
        {value === null ? '—' : formatPercent(value)}
      </div>
      {value !== null && (
        <div className="relative h-1.5 rounded-full bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${value * 100}%` }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="absolute -top-1 left-1/2 h-3.5 w-px bg-foreground/50" />
        </div>
      )}
      <div className="text-xs text-muted-foreground">Khoảng 50% nghĩa là đã mất hoàn toàn</div>
    </div>
  )
}
