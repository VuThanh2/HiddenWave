import { FileLock2, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { api } from '@/api/client'
import type { EncodeResult, StegoMode } from '@/api/types'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { ErrorNotice } from '@/components/ErrorNotice'
import { ModeFields } from '@/components/ModeFields'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SubmitButton } from '@/components/SubmitButton'
import { Textarea } from '@/components/ui/textarea'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useRequest } from '@/hooks/useRequest'
import { firstBlocker, passphraseBlocker, slotBlocker } from '@/lib/blockers'
import { formatInt } from '@/lib/format'
import { messageByteLength } from '@/lib/message'
import { cn } from '@/lib/utils'
import { useSession } from '@/session/session-context'
import { useSlotFile } from '@/session/useSlotFile'

import { CapacityMeter } from './CapacityMeter'
import { EncodeResultCard } from './EncodeResultCard'

interface EncodeRequest {
  cover: File
  message: string
  mode: StegoMode
  passphrase: string
}

interface EncodeOutcome {
  request: EncodeRequest
  result: EncodeResult
  totalSamples: number
}

export function EncodePage() {
  const session = useSession()
  const cover = useSlotFile('cover')
  const [mode, setMode] = useState<StegoMode>('classic')
  const [passphrase, setPassphrase] = useState('')
  const [message, setMessage] = useState('')

  const encode = useRequest(
    async (signal, request: EncodeRequest, totalSamples: number): Promise<EncodeOutcome> => {
      const result = await api.encode(request, signal)
      return { request, result, totalSamples }
    },
  )

  const usedBytes = useMemo(() => messageByteLength(message), [message])
  const characters = useMemo(() => [...message].length, [message])
  const capacityOf = (value: StegoMode) =>
    cover.info ? (value === 'classic' ? cover.info.classic_bytes : cover.info.hardened_bytes) : null
  const capacity = capacityOf(mode)

  const blocker = firstBlocker(
    slotBlocker(cover, 'cover'),
    message.length === 0 && 'Nhập message',
    passphraseBlocker(mode, passphrase),
    capacity !== null && usedBytes > capacity && 'Message quá dài',
  )

  const submit = async () => {
    if (blocker || !cover.file || !cover.info) return
    const outcome = await encode.run(
      { cover: cover.file, message, mode, passphrase },
      cover.info.audio.sample_count,
    )
    if (outcome) {
      session.setFile('stego', outcome.result.stego, 'encoded')
      session.setMode(outcome.request.mode)
    }
  }

  const outcome = encode.data
  const stale =
    outcome !== undefined &&
    (outcome.request.cover !== cover.file ||
      outcome.request.message !== message ||
      outcome.request.mode !== mode)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sử dụng · Bước 1"
        title="Encode"
        description="Giấu một đoạn tin nhắn vào file WAV. File tạo ra (stego) nghe giống hệt file gốc."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <Section step={1} title="File cover" description="File âm thanh gốc dùng để giấu tin.">
            <WavFileSlot slot={cover} />
          </Section>

          <Section step={2} title="Chế độ">
            <ModeFields
              mode={mode}
              onModeChange={setMode}
              passphrase={passphrase}
              onPassphraseChange={setPassphrase}
              modeDetail={(value) => <ModeCapacity bytes={capacityOf(value)} />}
            />
          </Section>

          <Section step={3} title="Message">
            <div className="space-y-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void submit()
                }}
                placeholder="Nhập message cần giấu…"
                rows={6}
                className="min-h-36 resize-y text-sm leading-relaxed"
                aria-invalid={(capacity !== null && usedBytes > capacity) || undefined}
              />
              <CapacityMeter
                usedBytes={usedBytes}
                characters={characters}
                capacityBytes={capacity}
              />
            </div>
          </Section>
        </div>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <Section title="Kết quả">
            <div className="space-y-4">
              <SubmitButton
                label="Encode"
                loadingLabel="Đang giấu tin…"
                icon={FileLock2}
                onClick={submit}
                loading={encode.isLoading}
                blockedReason={blocker}
                shortcut="Ctrl ↵"
              />
              <ErrorNotice error={encode.error} />
              <AnimatePresence mode="wait">
                {outcome ? (
                  <EncodeResultCard
                    key={outcome.result.stego.name + outcome.result.stats.changedSamples}
                    result={outcome.result}
                    mode={outcome.request.mode}
                    totalSamples={outcome.totalSamples}
                    stale={stale}
                  />
                ) : (
                  !encode.error && <EmptyResult key="empty" />
                )}
              </AnimatePresence>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function ModeCapacity({ bytes }: { bytes: number | null }) {
  return (
    <span className={cn('text-xs text-muted-foreground tabular', bytes === null && 'opacity-60')}>
      Tối đa{' '}
      {bytes === null ? (
        '—'
      ) : (
        <AnimatedNumber
          value={bytes}
          format={(value) => `${formatInt(Math.round(value))} byte`}
          className="font-medium text-foreground"
        />
      )}
    </span>
  )
}

function EmptyResult() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center"
    >
      <Sparkles className="size-5 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">File stego sẽ xuất hiện ở đây.</p>
    </motion.div>
  )
}
