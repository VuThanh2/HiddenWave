import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'

import type { StegoMode, SweepPointModel, SweepResponse } from '@/api/types'
import { useChartPalette, type ChartPalette } from '@/components/charts/chart-theme'
import { Plot } from '@/components/charts/Plot'
import { MODE_META } from '@/lib/modes'

import { DETECTION_P_VALUE } from './verdict'

interface Metric {
  title: string
  description: string
  axisTitle: string
  value: (point: SweepPointModel) => number | null
  baseline?: (sweep: SweepResponse) => number | null
  range?: [number, number]
  format: string
  threshold?: number
  identity?: boolean
  requiresRs?: boolean
}

const MODES: StegoMode[] = ['classic', 'hardened']

const METRICS: Metric[] = [
  {
    title: 'Chi-square toàn file',
    description: 'Càng gần 1 càng dễ bị phát hiện.',
    axisTitle: 'p-value',
    value: (point) => point.analysis.chi_square.p_value,
    baseline: (sweep) => sweep.cover.chi_square.p_value,
    range: [-0.03, 1.05],
    format: '.4f',
    threshold: DETECTION_P_VALUE,
  },
  {
    title: 'Đoạn bị phát hiện',
    description: 'Tỉ lệ đoạn trong file bị Chi-square phát hiện.',
    axisTitle: 'Tỉ lệ đoạn',
    value: (point) => point.analysis.windows.detected_fraction,
    baseline: (sweep) => sweep.cover.windows.detected_fraction,
    range: [-0.03, 1.05],
    format: '.1%',
  },
  {
    title: 'RS Analysis',
    description: 'Tỉ lệ giấu tin ước tính; càng sát đường chấm càng dễ bị lộ.',
    axisTitle: 'Ước tính',
    value: (point) => point.analysis.rs?.estimated_rate ?? null,
    baseline: (sweep) => sweep.cover.rs?.estimated_rate ?? null,
    format: '.1%',
    identity: true,
    requiresRs: true,
  },
  {
    title: 'PSNR',
    description: 'Càng cao càng giống file gốc.',
    axisTitle: 'PSNR (dB)',
    value: (point) => point.psnr_db,
    format: '.2f',
  },
]

export function SweepCharts({ sweep, includeRs }: { sweep: SweepResponse; includeRs: boolean }) {
  const metrics = includeRs ? METRICS : METRICS.filter((metric) => !metric.requiresRs)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {metrics.map((metric) => (
        <SweepChart key={metric.title} metric={metric} sweep={sweep} />
      ))}
    </div>
  )
}

function SweepChart({ metric, sweep }: { metric: Metric; sweep: SweepResponse }) {
  const palette = useChartPalette()
  const data = useMemo(() => chartData(metric, sweep, palette), [metric, sweep, palette])
  const layout = useMemo(() => chartLayout(metric, sweep, palette), [metric, sweep, palette])

  return (
    <div className="space-y-2 rounded-2xl border bg-card/80 p-4">
      <div>
        <div className="text-sm font-semibold">{metric.title}</div>
        <div className="text-xs text-muted-foreground">{metric.description}</div>
      </div>
      <div className="h-64">
        <Plot data={data} layout={layout} className="h-full" />
      </div>
    </div>
  )
}

function ratePercents(sweep: SweepResponse): number[] {
  return [...new Set(sweep.points.map((point) => point.requested_rate * 100))]
}

function chartData(metric: Metric, sweep: SweepResponse, palette: ChartPalette): Data[] {
  const colors: Record<StegoMode, string> = { classic: palette.classic, hardened: palette.hardened }
  const traces: Data[] = MODES.map((mode) => {
    const points = sweep.points.filter((point) => point.mode === mode)
    return {
      type: 'scatter',
      mode: 'lines+markers',
      name: MODE_META[mode].label,
      x: points.map((point) => point.requested_rate * 100),
      y: points.map(metric.value),
      customdata: points.map((point) => point.embedding_rate * 100),
      line: { color: colors[mode], width: 2.5 },
      marker: { size: 7, color: colors[mode] },
      connectgaps: false,
      hovertemplate: `${MODE_META[mode].label} · mức %{x}% (thực tế %{customdata:.2f}%)<br>%{y:${metric.format}}<extra></extra>`,
    }
  })

  if (metric.identity) {
    const rates = ratePercents(sweep)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Lý tưởng',
      x: rates,
      y: rates.map((rate) => rate / 100),
      line: { color: palette.muted, width: 1, dash: 'dot' },
      hoverinfo: 'skip',
    })
  }
  return traces
}

function chartLayout(metric: Metric, sweep: SweepResponse, palette: ChartPalette): Partial<Layout> {
  const shapes: NonNullable<Layout['shapes']> = []
  const annotations: NonNullable<Layout['annotations']> = []
  const baseline = metric.baseline?.(sweep)

  if (baseline !== undefined && baseline !== null) {
    shapes.push({
      type: 'line',
      xref: 'paper',
      x0: 0,
      x1: 1,
      y0: baseline,
      y1: baseline,
      line: { color: palette.baseline, width: 1.5, dash: 'dash' },
    })
    annotations.push({
      xref: 'paper',
      x: 0,
      y: baseline,
      xanchor: 'left',
      yanchor: 'bottom',
      text: 'file gốc',
      showarrow: false,
      font: { size: 10, color: palette.baseline },
    })
  }
  if (metric.threshold !== undefined) {
    shapes.push({
      type: 'line',
      xref: 'paper',
      x0: 0,
      x1: 1,
      y0: metric.threshold,
      y1: metric.threshold,
      line: { color: palette.threshold, width: 1, dash: 'dot' },
    })
  }

  return {
    margin: { l: 56, r: 12, t: 24, b: 44 },
    hovermode: 'closest',
    xaxis: { title: { text: 'Mức giấu tin (%)' }, ticksuffix: '%' },
    yaxis: {
      title: { text: metric.axisTitle },
      range: metric.range,
      tickformat: metric.format === '.1%' ? '.0%' : undefined,
    },
    shapes,
    annotations,
  }
}
