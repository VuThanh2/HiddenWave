import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'

import type { SpectrogramModel } from '@/api/types'
import { Plot } from '@/components/charts/Plot'
import { cn } from '@/lib/utils'

const COLORSCALE = 'Viridis'

interface Props {
  cover: SpectrogramModel
  stego: SpectrogramModel
}

/** Hai spectrogram đặt cạnh nhau, cùng thang màu dB để so sánh trực tiếp. */
export function SpectrogramPair({ cover, stego }: Props) {
  const range = useMemo(() => sharedRange([cover, stego]), [cover, stego])
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SpectrogramPanel title="Cover" tone="text-cover" spectrogram={cover} range={range} />
      <SpectrogramPanel
        title="Stego"
        tone="text-stego"
        spectrogram={stego}
        range={range}
        showScale
      />
    </div>
  )
}

interface PanelProps {
  title: string
  tone: string
  spectrogram: SpectrogramModel
  range: [number, number]
  showScale?: boolean
}

function SpectrogramPanel({ title, tone, spectrogram, range, showScale }: PanelProps) {
  const data = useMemo<Data[]>(
    () => [
      {
        type: 'heatmap',
        x: spectrogram.times,
        y: spectrogram.frequencies.map((hz) => hz / 1000),
        z: spectrogram.power_db,
        zmin: range[0],
        zmax: range[1],
        colorscale: COLORSCALE,
        showscale: showScale,
        colorbar: { title: { text: 'dBFS', side: 'right' }, thickness: 10, outlinewidth: 0 },
        hovertemplate: '%{x:.2f} s · %{y:.2f} kHz<br>%{z:.1f} dBFS<extra></extra>',
      },
    ],
    [spectrogram, range, showScale],
  )
  const layout = useMemo<Partial<Layout>>(
    () => ({
      margin: { l: 52, r: showScale ? 8 : 16, t: 8, b: 40 },
      xaxis: { title: { text: 'Thời gian (s)' } },
      yaxis: { title: { text: 'Tần số (kHz)' } },
    }),
    [showScale],
  )

  return (
    <div className="space-y-1.5">
      <div className={cn('text-xs font-semibold tracking-wide uppercase', tone)}>{title}</div>
      <div className="h-72">
        <Plot data={data} layout={layout} className="h-full" />
      </div>
    </div>
  )
}

function sharedRange(spectrograms: SpectrogramModel[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const { power_db } of spectrograms) {
    for (const row of power_db) {
      for (const value of row) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }
  }
  return Number.isFinite(min) ? [min, max] : [-120, 0]
}
