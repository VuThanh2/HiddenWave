import { FlaskConical, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { api } from '@/api/client'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Section } from '@/components/Section'
import { SubmitButton } from '@/components/SubmitButton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useElapsed } from '@/hooks/useElapsed'
import { useRequest } from '@/hooks/useRequest'
import { firstBlocker, slotBlocker } from '@/lib/blockers'
import { formatDecimal, formatInt } from '@/lib/format'
import { useSlotFile } from '@/session/useSlotFile'

import { RatePicker } from './RatePicker'
import { SweepCharts } from './SweepCharts'
import { SweepTable } from './SweepTable'
import { DEFAULT_WINDOW_SECONDS, windowSamples } from './verdict'
import { WindowPicker } from './WindowPicker'

// Cùng DEFAULT_RATES của engine (5% → 100%).
const DEFAULT_PERCENTS = [5, 10, 25, 50, 75, 100]

interface SweepSettings {
  cover: File
  percents: number[]
  includeRs: boolean
  windowSize: number
}

export function SweepTab() {
  const cover = useSlotFile('cover')
  const [percents, setPercents] = useState(DEFAULT_PERCENTS)
  const [includeRs, setIncludeRs] = useState(true)
  const [windowSeconds, setWindowSeconds] = useState(DEFAULT_WINDOW_SECONDS)

  const sweep = useRequest(async (signal, settings: SweepSettings) => {
    const response = await api.sweep(
      {
        cover: settings.cover,
        rates: settings.percents.map((percent) => percent / 100),
        includeRs: settings.includeRs,
        windowSize: settings.windowSize,
      },
      signal,
    )
    return { response, settings }
  })
  const elapsed = useElapsed(sweep.isLoading)

  const blocker = firstBlocker(
    slotBlocker(cover, 'cover'),
    percents.length === 0 && 'Chọn ít nhất một mức',
  )

  const run = () => {
    if (blocker || !cover.file || !cover.info) return
    const { sample_rate: rate, channels } = cover.info.audio
    void sweep.run({
      cover: cover.file,
      percents,
      includeRs,
      windowSize: windowSamples(windowSeconds, rate * channels),
    })
  }

  const result = sweep.data

  return (
    <div className="space-y-6">
      <Section
        title="Thiết lập"
        description="Giấu dữ liệu ngẫu nhiên ở nhiều mức bằng cả hai chế độ, rồi so sánh khả năng bị phát hiện."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <WavFileSlot slot={cover} label="Cover" disabled={sweep.isLoading} />
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Mức giấu tin (% dung lượng)</Label>
              <RatePicker value={percents} onChange={setPercents} disabled={sweep.isLoading} />
            </div>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="space-y-1.5">
                <Label>Độ dài mỗi đoạn</Label>
                <WindowPicker
                  value={windowSeconds}
                  onChange={setWindowSeconds}
                  disabled={sweep.isLoading}
                />
              </div>
              <label className="flex h-7 items-center gap-2 text-sm">
                <Switch
                  checked={includeRs}
                  onCheckedChange={setIncludeRs}
                  disabled={sweep.isLoading}
                />
                RS Analysis
                <span className="text-xs text-muted-foreground">(tắt để nhanh hơn)</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-5 border-t pt-4">
          <AnimatePresence mode="wait" initial={false}>
            {sweep.isLoading ? (
              <SweepProgress
                key="progress"
                elapsed={elapsed}
                runs={percents.length * 2}
                onCancel={sweep.abort}
              />
            ) : (
              <motion.div
                key="submit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SubmitButton
                  className="sm:ml-auto sm:w-64"
                  label="Chạy thí nghiệm"
                  icon={FlaskConical}
                  onClick={run}
                  blockedReason={blocker}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <ErrorNotice error={sweep.error} />

      <AnimatePresence>
        {result && (
          <motion.div
            key={result.settings.cover.name + result.response.points.length}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: sweep.isLoading ? 0.5 : 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <SweepCharts sweep={result.response} includeRs={result.settings.includeRs} />
            <Section title="Bảng kết quả" description={`File: ${result.settings.cover.name}`}>
              <SweepTable sweep={result.response} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ProgressProps {
  elapsed: number
  runs: number
  onCancel: () => void
}

function SweepProgress({ elapsed, runs, onCancel }: ProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Đang chạy thí nghiệm ({formatInt(runs)} lượt)…</div>
          <div className="text-xs text-muted-foreground tabular">
            {formatDecimal(elapsed, 1)} s · file dài có thể mất vài phút
          </div>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <Square className="fill-current" />
          Huỷ
        </Button>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-primary to-transparent"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Huỷ chỉ dừng chờ trên trình duyệt, engine vẫn chạy nốt ở nền.
      </p>
    </motion.div>
  )
}
