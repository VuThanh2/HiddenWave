import type { Config, Data, Layout, LayoutAxis, PlotlyHTMLElement } from 'plotly.js'
import Plotly from 'plotly.js-cartesian-dist-min'
import { useEffect, useMemo, useRef } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'

import { cn } from '@/lib/utils'

import { baseLayout, useChartPalette } from './chart-theme'

// Bundle cartesian (scatter, bar, heatmap…) thay cho plotly.js full để giảm kích thước build.
const BasePlot = createPlotlyComponent(Plotly)

const BASE_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: false,
  modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
  toImageButtonOptions: { format: 'png', scale: 2 },
}

interface Props {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  className?: string
}

/** Plotly theo theme của app; tự resize theo khung chứa (kể cả khi màn hình bị ẩn rồi hiện lại). */
export function Plot({ data, layout, config, className }: Props) {
  const palette = useChartPalette()
  const containerRef = useRef<HTMLDivElement>(null)

  const mergedLayout = useMemo(() => mergeLayout(baseLayout(palette), layout), [palette, layout])
  const mergedConfig = useMemo(() => ({ ...BASE_CONFIG, ...config }), [config])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const graph = container.querySelector<PlotlyHTMLElement>('.js-plotly-plot')
        if (graph && container.clientWidth > 0) void Plotly.Plots.resize(graph)
      })
    })
    observer.observe(container)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <BasePlot
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={false}
      />
    </div>
  )
}

// Gộp nông từng trục để layout riêng của biểu đồ chỉ cần ghi đè phần khác biệt.
function mergeLayout(
  base: Partial<Layout>,
  override: Partial<Layout> | undefined,
): Partial<Layout> {
  if (!override) return base
  const merged: Record<string, unknown> = { ...base, ...override }
  const baseAxis = base.xaxis ?? {}
  for (const [key, value] of Object.entries(override)) {
    if (!/^[xy]axis\d*$/.test(key)) continue
    const axis = value as Partial<LayoutAxis>
    merged[key] = {
      ...baseAxis,
      ...axis,
      title: { ...(baseAxis.title as object), ...(axis.title as object) },
    }
  }
  return merged as Partial<Layout>
}
