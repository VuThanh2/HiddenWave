import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'

import type { WindowedChiSquareModel } from '@/api/types'
import { useChartPalette, withAlpha } from '@/components/charts/chart-theme'
import { Plot } from '@/components/charts/Plot'

import { DETECTION_P_VALUE } from './verdict'

export interface TimelineSeries {
  name: string
  color: string
  windows: WindowedChiSquareModel
}

export function PValueTimeline({ series }: { series: TimelineSeries[] }) {
  const palette = useChartPalette()

  const data = useMemo<Data[]>(
    () =>
      series.map(({ name, color, windows }) => ({
        type: 'scatter',
        mode: windows.p_values.length > 120 ? 'lines' : 'lines+markers',
        name,
        x: windows.start_seconds,
        y: windows.p_values,
        line: { color, width: 2, shape: 'hv' },
        marker: { size: 5, color },
        connectgaps: false,
        hovertemplate: `${name}<br>%{x:.2f} s · p = %{y:.4f}<extra></extra>`,
      })),
    [series],
  )

  const layout = useMemo<Partial<Layout>>(
    () => ({
      margin: { l: 56, r: 16, t: 28, b: 44 },
      hovermode: 'closest',
      xaxis: { title: { text: 'Thời gian (s)' } },
      yaxis: { title: { text: 'p-value' }, range: [-0.03, 1.05] },
      shapes: [
        {
          type: 'rect',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: DETECTION_P_VALUE,
          y1: 1.05,
          fillcolor: withAlpha(palette.threshold, 0.08),
          line: { width: 0 },
        },
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: DETECTION_P_VALUE,
          y1: DETECTION_P_VALUE,
          line: { color: palette.threshold, width: 1, dash: 'dash' },
        },
      ],
      annotations: [
        {
          xref: 'paper',
          x: 1,
          y: DETECTION_P_VALUE,
          xanchor: 'right',
          yanchor: 'bottom',
          text: 'vùng bị phát hiện',
          showarrow: false,
          font: { size: 10, color: palette.threshold },
        },
      ],
    }),
    [palette],
  )

  return (
    <div className="h-80">
      <Plot data={data} layout={layout} className="h-full" />
    </div>
  )
}
