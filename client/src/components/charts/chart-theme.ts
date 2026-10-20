import type { Layout } from 'plotly.js'

import { useTheme, type ResolvedTheme } from '@/theme/theme-context'

// Plotly không đọc được màu oklch của CSS, nên bảng màu biểu đồ khai báo hex song song với token.
export interface ChartPalette {
  cover: string
  stego: string
  classic: string
  hardened: string
  baseline: string
  threshold: string
  text: string
  muted: string
  grid: string
  zero: string
  hoverBg: string
  font: string
}

const FONT = "'Geist Variable', ui-sans-serif, system-ui, sans-serif"

const PALETTES: Record<ResolvedTheme, ChartPalette> = {
  light: {
    cover: '#0284c7',
    stego: '#9333ea',
    classic: '#d97706',
    hardened: '#059669',
    baseline: '#64748b',
    threshold: '#dc2626',
    text: '#1e293b',
    muted: '#64748b',
    grid: 'rgba(15, 23, 42, 0.07)',
    zero: 'rgba(15, 23, 42, 0.18)',
    hoverBg: '#ffffff',
    font: FONT,
  },
  dark: {
    cover: '#38bdf8',
    stego: '#c084fc',
    classic: '#fbbf24',
    hardened: '#34d399',
    baseline: '#94a3b8',
    threshold: '#f87171',
    text: '#e2e8f0',
    muted: '#94a3b8',
    grid: 'rgba(226, 232, 240, 0.07)',
    zero: 'rgba(226, 232, 240, 0.2)',
    hoverBg: '#1e2330',
    font: FONT,
  },
}

export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

export function baseLayout(palette: ChartPalette): Partial<Layout> {
  const axis = {
    gridcolor: palette.grid,
    zerolinecolor: palette.zero,
    linecolor: palette.grid,
    tickfont: { size: 11, color: palette.muted },
    title: { font: { size: 12, color: palette.muted } },
    automargin: true,
  }
  return {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: palette.font, color: palette.text, size: 12 },
    margin: { l: 56, r: 16, t: 16, b: 44 },
    hoverlabel: {
      bgcolor: palette.hoverBg,
      bordercolor: palette.grid,
      font: { family: palette.font, color: palette.text, size: 12 },
    },
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.02,
      yanchor: 'bottom',
      font: { size: 11, color: palette.muted },
      bgcolor: 'rgba(0,0,0,0)',
    },
    xaxis: axis,
    yaxis: axis,
    dragmode: 'zoom',
  }
}

export function useChartPalette(): ChartPalette {
  return PALETTES[useTheme().theme]
}
