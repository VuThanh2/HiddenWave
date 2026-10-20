import { Headphones, Play } from 'lucide-react'

import { Section } from '@/components/Section'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SubmitButton } from '@/components/SubmitButton'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { WavFileSlot } from '@/components/WavFileSlot'
import type { AudioDuration } from '@/hooks/useAudioDuration'
import { firstBlocker } from '@/lib/blockers'
import { formatDuration, formatNumber } from '@/lib/format'
import type { SlotFile } from '@/session/useSlotFile'

import { CLIP_LENGTHS, TRIAL_COUNTS, type AbxSettings } from './abx'
import type { Clip } from './useClipPlayer'

interface Props {
  cover: SlotFile
  stego: SlotFile
  coverDuration: AudioDuration
  stegoDuration: AudioDuration
  settings: AbxSettings
  onSettingsChange: (settings: AbxSettings) => void
  onStart: () => void
}

function durationBlocker(duration: AudioDuration, label: string): string | null {
  switch (duration.status) {
    case 'empty':
      return `Chọn file ${label}`
    case 'loading':
      return `Đang đọc file ${label}…`
    case 'error':
      return `Trình duyệt không phát được file ${label}`
    case 'ready':
      return null
  }
}

export function SetupStep({
  cover,
  stego,
  coverDuration,
  stegoDuration,
  settings,
  onSettingsChange,
  onStart,
}: Props) {
  const duration =
    coverDuration.status === 'ready' && stegoDuration.status === 'ready'
      ? Math.min(coverDuration.seconds, stegoDuration.seconds)
      : 0
  const clipLength = Math.min(settings.clip.length, duration)
  const maxStart = Math.max(0, duration - clipLength)

  const blocker = firstBlocker(
    durationBlocker(coverDuration, 'cover'),
    durationBlocker(stegoDuration, 'stego'),
  )

  const updateClip = (clip: Partial<Clip>) =>
    onSettingsChange({ ...settings, clip: { ...settings.clip, ...clip } })

  return (
    <div className="space-y-4">
      <Section step={1} title="Chọn hai file" description="Tên file sẽ được ẩn trong lúc làm bài.">
        <div className="grid gap-4 md:grid-cols-2">
          <WavFileSlot slot={cover} label="Cover" />
          <WavFileSlot slot={stego} label="Stego" />
        </div>
      </Section>

      <Section step={2} title="Tuỳ chọn">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Số lượt</Label>
            <SegmentedControl
              aria-label="Số lượt"
              value={String(settings.trialCount)}
              onChange={(value) => onSettingsChange({ ...settings, trialCount: Number(value) })}
              options={TRIAL_COUNTS.map((count) => ({ value: String(count), label: count }))}
            />
            <p className="text-xs text-muted-foreground">Càng nhiều lượt, kết quả càng tin cậy.</p>
          </div>
          <div className="space-y-2">
            <Label>Độ dài đoạn nghe</Label>
            <SegmentedControl
              aria-label="Độ dài đoạn nghe"
              value={String(settings.clip.length)}
              onChange={(value) => updateClip({ length: Number(value) })}
              options={CLIP_LENGTHS.map((seconds) => ({
                value: String(seconds),
                label: `${seconds} s`,
              }))}
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-baseline justify-between">
              <Label>Bắt đầu từ</Label>
              <span className="font-mono text-xs text-muted-foreground tabular">
                {formatDuration(Math.min(settings.clip.start, maxStart))} →{' '}
                {formatDuration(Math.min(settings.clip.start, maxStart) + clipLength)}
                {duration > 0 && ` / ${formatDuration(duration)}`}
              </span>
            </div>
            <Slider
              min={0}
              max={Math.max(maxStart, 0.1)}
              step={0.5}
              value={[Math.min(settings.clip.start, maxStart)]}
              onValueChange={([start]) => updateClip({ start })}
              disabled={duration === 0}
            />
            <p className="text-xs text-muted-foreground">Nên chọn đoạn có cả phần nhỏ tiếng.</p>
          </div>
        </div>
      </Section>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/80 p-4 sm:flex-row sm:items-center">
        <Headphones className="hidden size-5 text-muted-foreground sm:block" />
        <p className="flex-1 text-xs text-muted-foreground">
          Mỗi lượt nghe A, B và X, rồi chọn X giống A hay B. Kết quả hiện khi làm xong{' '}
          {formatNumber(settings.trialCount)} lượt. Nên dùng tai nghe.
        </p>
        <SubmitButton
          className="sm:w-48"
          label="Bắt đầu"
          icon={Play}
          onClick={onStart}
          blockedReason={blocker}
        />
      </div>
    </div>
  )
}
