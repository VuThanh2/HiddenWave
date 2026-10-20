import { AudioLines, RotateCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

import { api } from '@/api/client'
import type { CompareResponse } from '@/api/types'
import { AudioCompare } from '@/components/audio/AudioCompare'
import { useChartPalette } from '@/components/charts/chart-theme'
import { ErrorNotice } from '@/components/ErrorNotice'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useRequest } from '@/hooks/useRequest'
import { useSlotFile } from '@/session/useSlotFile'

import { DifferenceView } from './DifferenceView'
import { EnvelopeChart, type EnvelopeSeries } from './EnvelopeChart'
import { MetricCards } from './MetricCards'
import { SpectrogramPair } from './SpectrogramPair'

type ChartTab = 'waveform' | 'difference' | 'spectrogram'

const CHART_TABS = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'difference', label: 'Difference' },
  { value: 'spectrogram', label: 'Spectrogram' },
] satisfies { value: ChartTab; label: string }[]

export function ComparePage() {
  const cover = useSlotFile('cover')
  const stego = useSlotFile('stego')
  const compare = useRequest((signal, coverFile: File, stegoFile: File) =>
    api.compare(coverFile, stegoFile, signal),
  )
  const { run, reset } = compare

  const bothReady = cover.info !== null && stego.info !== null
  const coverFile = cover.file
  const stegoFile = stego.file

  // Chạy lại mỗi khi cặp file đổi: đi từ Encode sang là có số đo ngay, không cần bấm thêm.
  useEffect(() => {
    if (bothReady && coverFile && stegoFile) void run(coverFile, stegoFile)
    else reset()
  }, [bothReady, coverFile, stegoFile, run, reset])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đánh giá · Độ khó nghe ra"
        title="Compare"
        description="File stego có khác file gốc không? Nghe thử, xem số đo và biểu đồ của hai file."
        actions={
          compare.error &&
          coverFile &&
          stegoFile && (
            <Button
              variant="outline"
              onClick={() => void run(coverFile, stegoFile)}
              disabled={compare.isLoading}
            >
              <RotateCw className={compare.isLoading ? 'animate-spin' : undefined} />
              Thử lại
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Cover" className="p-4">
          <WavFileSlot slot={cover} />
        </Section>
        <Section title="Stego" className="p-4">
          <WavFileSlot slot={stego} />
        </Section>
      </div>

      <ErrorNotice error={compare.error} />

      {bothReady && coverFile && stegoFile ? (
        <>
          <Section
            title="Nghe so sánh"
            description="Bấm Cover/Stego để chuyển qua lại ngay tại đoạn đang nghe."
          >
            <AudioCompare cover={coverFile} stego={stegoFile} />
          </Section>
          <CompareResults state={compare.data} loading={compare.isLoading} />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function CompareResults({ state, loading }: { state?: CompareResponse; loading: boolean }) {
  const [tab, setTab] = useState<ChartTab>('waveform')

  if (!state) return loading ? <ResultsSkeleton /> : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: loading ? 0.6 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Section title="Mức độ khác biệt">
        <MetricCards metrics={state.metrics} />
      </Section>

      <Section
        title="Biểu đồ"
        description="Kéo chuột để phóng to, nhấp đúp để xem lại toàn bộ."
        aside={
          <SegmentedControl
            size="sm"
            aria-label="Loại biểu đồ"
            value={tab}
            onChange={setTab}
            options={CHART_TABS}
            className="hidden sm:inline-flex"
          />
        }
      >
        <SegmentedControl
          size="sm"
          aria-label="Loại biểu đồ"
          value={tab}
          onChange={setTab}
          options={CHART_TABS}
          className="mb-4 flex w-full sm:hidden"
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'waveform' && <WaveformTab state={state} />}
            {tab === 'difference' && (
              <DifferenceView difference={state.difference} channels={state.audio.channels} />
            )}
            {tab === 'spectrogram' && (
              <SpectrogramPair cover={state.cover_spectrogram} stego={state.stego_spectrogram} />
            )}
          </motion.div>
        </AnimatePresence>
      </Section>
    </motion.div>
  )
}

function WaveformTab({ state }: { state: CompareResponse }) {
  const palette = useChartPalette()
  const series = useMemo<EnvelopeSeries[]>(
    () => [
      { name: 'Cover', envelope: state.cover_waveform, color: palette.cover, style: 'band' },
      { name: 'Stego', envelope: state.stego_waveform, color: palette.stego, style: 'outline' },
    ],
    [state, palette],
  )
  return (
    <div className="space-y-3">
      <EnvelopeChart
        series={series}
        channels={state.audio.channels}
        height={state.audio.channels > 1 ? 380 : 300}
      />
      <p className="text-xs text-muted-foreground">
        Hai sóng âm trùng khít nhau. Xem tab Difference để thấy phần khác biệt.
      </p>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <AudioLines className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">Chọn file cover và file stego</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Nếu vừa Encode xong, hai file đã được điền sẵn.
        </p>
      </div>
    </div>
  )
}
