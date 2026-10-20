import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'

import type { EnvelopeModel } from '@/api/types'
import { withAlpha } from '@/components/charts/chart-theme'
import { Plot } from '@/components/charts/Plot'

export interface EnvelopeSeries {
  name: string
  envelope: EnvelopeModel
  color: string
  /** `band`: tô kín min→max; `outline`: chỉ vẽ viền để nhìn xuyên qua lớp bên dưới. */
  style: 'band' | 'outline'
}

interface Props {
  series: EnvelopeSeries[]
  channels: number
  yRange?: [number, number]
  yTickValues?: number[]
  height?: number
}

const CHANNEL_NAMES = ['L', 'R']

/** Waveform giảm mẫu theo min/max mỗi bucket; stereo vẽ mỗi kênh một hàng, dùng chung trục thời gian. */
export function EnvelopeChart({ series, channels, yRange, yTickValues, height = 320 }: Props) {
  const data = useMemo(
    () =>
      Array.from({ length: channels }, (_, channel) =>
        series.flatMap((item) => envelopeTraces(item, channel, channels)),
      ).flat(),
    [series, channels],
  )

  const layout = useMemo(
    () => envelopeLayout(channels, yRange, yTickValues),
    [channels, yRange, yTickValues],
  )

  return (
    <div style={{ height }}>
      <Plot data={data} layout={layout} className="h-full" />
    </div>
  )
}

function envelopeTraces(item: EnvelopeSeries, channel: number, channels: number): Data[] {
  const axis = channel === 0 ? 'y' : `y${channel + 1}`
  const label = channels > 1 ? `${item.name} · ${CHANNEL_NAMES[channel] ?? channel + 1}` : item.name
  const common = {
    type: 'scatter' as const,
    mode: 'lines' as const,
    x: item.envelope.times,
    yaxis: axis,
    legendgroup: item.name,
    hovertemplate: `${label} %{y}<extra></extra>`,
  }
  const band = item.style === 'band'
  return [
    {
      ...common,
      name: item.name,
      y: item.envelope.maximum[channel],
      line: { color: band ? 'rgba(0,0,0,0)' : item.color, width: band ? 0 : 1 },
      showlegend: false,
    },
    {
      ...common,
      name: item.name,
      y: item.envelope.minimum[channel],
      line: { color: band ? 'rgba(0,0,0,0)' : item.color, width: band ? 0 : 1 },
      fill: band ? 'tonexty' : 'none',
      fillcolor: withAlpha(item.color, 0.45),
      showlegend: channel === 0,
    },
  ]
}

function envelopeLayout(
  channels: number,
  yRange?: [number, number],
  yTickValues?: number[],
): Partial<Layout> {
  const gap = 0.08
  const rowHeight = (1 - gap * (channels - 1)) / channels
  const layout: Record<string, unknown> = {
    hovermode: 'x unified',
    margin: { l: 56, r: 16, t: 28, b: 40 },
    xaxis: { title: { text: 'Thời gian (s)' }, anchor: channels > 1 ? `y${channels}` : 'y' },
  }
  for (let channel = 0; channel < channels; channel++) {
    const top = 1 - channel * (rowHeight + gap)
    layout[channel === 0 ? 'yaxis' : `yaxis${channel + 1}`] = {
      domain: [top - rowHeight, top],
      range: yRange,
      tickvals: yTickValues,
      zeroline: true,
      fixedrange: false,
      title: { text: channels > 1 ? (CHANNEL_NAMES[channel] ?? '') : 'Biên độ' },
    }
  }
  return layout as Partial<Layout>
}
