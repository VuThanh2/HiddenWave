import { ScanSearch } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { api } from '@/api/client'
import type { CapacityResponse } from '@/api/types'
import { useChartPalette } from '@/components/charts/chart-theme'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Section } from '@/components/Section'
import { SubmitButton } from '@/components/SubmitButton'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useRequest } from '@/hooks/useRequest'
import { firstBlocker, slotBlocker } from '@/lib/blockers'
import { useSlotFile } from '@/session/useSlotFile'

import type { FileAnalysis } from './FileReport'
import { FileReport } from './FileReport'
import { PValueTimeline, type TimelineSeries } from './PValueTimeline'
import { DEFAULT_WINDOW_SECONDS, DETECTION_P_VALUE, windowSamples } from './verdict'
import { WindowPicker } from './WindowPicker'

interface Target {
  file: File
  info: CapacityResponse
}

interface WindowSettings {
  seconds: number
  overlap: boolean
}

async function analyzeFile(
  { file, info }: Target,
  settings: WindowSettings,
  signal: AbortSignal,
): Promise<FileAnalysis> {
  const samplesPerSecond = info.audio.sample_rate * info.audio.channels
  const windowSize = windowSamples(settings.seconds, samplesPerSecond)
  const step = settings.overlap ? windowSamples(settings.seconds / 2, samplesPerSecond) : undefined
  const [chiSquare, rs] = await Promise.all([
    api.chiSquare({ file, windowSize, step }, signal),
    api.rs(file, signal),
  ])
  return { file, chiSquare, rs }
}

export function FileCheckTab() {
  const palette = useChartPalette()
  const target = useSlotFile('stego')
  const reference = useSlotFile('cover')
  const [settings, setSettings] = useState<WindowSettings>({
    seconds: DEFAULT_WINDOW_SECONDS,
    overlap: false,
  })

  const analysis = useRequest(
    async (signal, subject: Target, control: Target | null, windows: WindowSettings) => {
      const [subjectResult, controlResult] = await Promise.all([
        analyzeFile(subject, windows, signal),
        control ? analyzeFile(control, windows, signal) : Promise.resolve(null),
      ])
      return { subject: subjectResult, control: controlResult }
    },
  )

  const referenceBlocker = reference.file && reference.probe.status !== 'ready'
  const blocker = firstBlocker(
    slotBlocker(target, 'cần kiểm tra'),
    referenceBlocker && slotBlocker(reference, 'đối chứng'),
  )

  const run = (windows: WindowSettings) => {
    if (!target.file || !target.info) return
    const control =
      reference.file && reference.info ? { file: reference.file, info: reference.info } : null
    void analysis.run({ file: target.file, info: target.info }, control, windows)
  }

  // Đổi cửa sổ sau khi đã có kết quả thì chạy lại ngay, để thấy p-value thay đổi theo cỡ cửa sổ.
  const updateSettings = (next: WindowSettings) => {
    setSettings(next)
    if (analysis.data && !blocker) run(next)
  }

  const result = analysis.data
  const timeline = useMemo<TimelineSeries[]>(() => {
    if (!result) return []
    const series = [
      {
        name: result.subject.file.name,
        color: palette.stego,
        windows: result.subject.chiSquare.windows,
      },
    ]
    if (result.control) {
      series.push({
        name: result.control.file.name,
        color: palette.cover,
        windows: result.control.chiSquare.windows,
      })
    }
    return series
  }, [result, palette])

  return (
    <div className="space-y-6">
      <Section
        title="Thiết lập"
        description="Thêm file đối chứng (thường là file gốc) để có mốc so sánh."
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <WavFileSlot slot={target} label="File cần kiểm tra" />
            <WavFileSlot slot={reference} label="File đối chứng" optional />
          </div>
          <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="space-y-1.5">
                <Label>Độ dài mỗi đoạn</Label>
                <WindowPicker
                  value={settings.seconds}
                  onChange={(seconds) => updateSettings({ ...settings, seconds })}
                  disabled={analysis.isLoading}
                />
              </div>
              <label className="flex h-7 items-center gap-2 text-sm">
                <Switch
                  checked={settings.overlap}
                  onCheckedChange={(overlap) => updateSettings({ ...settings, overlap })}
                  disabled={analysis.isLoading}
                />
                Các đoạn gối lên nhau
              </label>
            </div>
            <SubmitButton
              className="sm:w-56"
              label="Kiểm tra"
              loadingLabel="Đang phân tích…"
              icon={ScanSearch}
              onClick={() => run(settings)}
              loading={analysis.isLoading}
              blockedReason={blocker}
            />
          </div>
        </div>
      </Section>

      <ErrorNotice error={analysis.error} />

      <AnimatePresence>
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: analysis.isLoading ? 0.6 : 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FileReport title="File cần kiểm tra" tone="stego" analysis={result.subject} />
              {result.control ? (
                <FileReport
                  title="File đối chứng"
                  tone="cover"
                  analysis={result.control}
                  delay={0.08}
                />
              ) : (
                <div className="grid place-items-center rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Thêm file đối chứng để so sánh kết quả cạnh nhau.
                </div>
              )}
            </div>

            <Section
              title="Kết quả theo từng đoạn"
              description="Điểm nằm trong vùng đỏ là đoạn có dấu hiệu giấu tin."
            >
              <PValueTimeline series={timeline} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <ReadingGuide />
    </div>
  )
}

function ReadingGuide() {
  return (
    <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
      <p>
        <span className="font-medium text-foreground">Chi-square:</span> p-value càng gần 1 thì càng
        có khả năng file đã bị giấu tin (ngưỡng {DETECTION_P_VALUE}).
      </p>
      <p>
        <span className="font-medium text-foreground">RS Analysis:</span> ước tính tỉ lệ dữ liệu đã
        bị giấu trong file. Gần 0% nghĩa là file sạch.
      </p>
    </div>
  )
}
