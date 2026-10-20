import { FileAudio, History, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'

import type { AudioInfo } from '@/api/types'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Button } from '@/components/ui/button'
import {
  formatBytes,
  formatChannels,
  formatDuration,
  formatInt,
  formatSampleRate,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SlotFile } from '@/session/useSlotFile'

const ROLE_TONE = {
  cover: 'bg-cover/12 text-cover',
  stego: 'bg-stego/12 text-stego',
} as const

const ORIGIN_LABEL = { encoded: 'Vừa tạo', uploaded: 'Đã nạp' } as const

interface Props {
  slot: SlotFile
  /** Bỏ trống khi ô đã nằm trong một Section có tiêu đề riêng. */
  label?: string
  hint?: ReactNode
  optional?: boolean
  disabled?: boolean
  className?: string
}

export function WavFileSlot({ slot, label, hint, optional, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { file, probe, sessionAlternative } = slot

  const openPicker = () => inputRef.current?.click()

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped && !disabled) slot.select(dropped)
  }

  const dragHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      if (!disabled) setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop,
  }

  return (
    <div className={cn('space-y-2', className)}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">
            {label}
            {optional && (
              <span className="ml-1.5 font-normal text-muted-foreground">(tuỳ chọn)</span>
            )}
          </span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".wav,audio/wav,audio/x-wav,audio/wave"
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (picked) slot.select(picked)
          event.target.value = ''
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            {...dragHandlers}
            className={cn(
              'rounded-xl border bg-card p-3 transition-colors',
              dragging && 'border-primary bg-primary/5',
              probe.status === 'invalid' && 'border-destructive/40',
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg',
                  ROLE_TONE[slot.role],
                )}
              >
                {probe.status === 'loading' ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <FileAudio className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </span>
                  {slot.origin && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                      {ORIGIN_LABEL[slot.origin]}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {probe.status === 'loading' && ' · đang đọc file…'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={openPicker}
                  disabled={disabled}
                  aria-label="Đổi file"
                  title="Đổi file"
                >
                  <RefreshCw />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={slot.clear}
                  disabled={disabled}
                  aria-label="Bỏ chọn file"
                  title="Bỏ chọn"
                >
                  <X />
                </Button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {probe.status === 'ready' && (
                <motion.div
                  key="info"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <AudioInfoChips audio={probe.info.audio} className="pt-3" />
                </motion.div>
              )}
            </AnimatePresence>
            {probe.status === 'invalid' && (
              <ErrorNotice error={probe.error} className="mt-3 border-0 bg-destructive/8" />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              {...dragHandlers}
              className={cn(
                'group flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-input px-4 py-6 text-center transition-all outline-none hover:border-primary/50 hover:bg-primary/3 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50',
                dragging && 'scale-[1.01] border-primary bg-primary/6',
              )}
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/12 group-hover:text-primary">
                <Upload className="size-4" />
              </span>
              <span className="text-sm">
                <span className="font-medium text-foreground">Chọn file WAV</span>
                <span className="text-muted-foreground"> hoặc kéo thả vào đây</span>
              </span>
              <span className="text-xs text-muted-foreground">WAV 16-bit, mono hoặc stereo</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {sessionAlternative && (
        <button
          type="button"
          onClick={slot.restore}
          disabled={disabled}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <History className="size-3.5 shrink-0" />
          <span className="truncate">
            Dùng lại file <span className="font-medium">{sessionAlternative.name}</span>
          </span>
        </button>
      )}
    </div>
  )
}

export function AudioInfoChips({ audio, className }: { audio: AudioInfo; className?: string }) {
  const items = [
    formatChannels(audio.channels),
    formatSampleRate(audio.sample_rate),
    formatDuration(audio.duration_seconds),
    `${formatInt(audio.sample_count)} mẫu`,
  ]
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
