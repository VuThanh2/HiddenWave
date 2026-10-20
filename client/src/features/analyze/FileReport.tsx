import { FileAudio } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import type { ChiSquareResponse, RsCountsModel, RsResponse } from '@/api/types'
import { formatInt, formatPercent, formatPValue, formatStatistic } from '@/lib/format'
import { cn } from '@/lib/utils'

import { chiSquareVerdict } from './verdict'
import { VerdictBadge } from './VerdictBadge'

export interface FileAnalysis {
  file: File
  chiSquare: ChiSquareResponse
  rs: RsResponse
}

interface Props {
  title: string
  tone: 'cover' | 'stego'
  analysis: FileAnalysis
  delay?: number
}

const TONES = { cover: 'text-cover bg-cover/12', stego: 'text-stego bg-stego/12' }

export function FileReport({ title, tone, analysis, delay = 0 }: Props) {
  const { whole_file: whole, windows } = analysis.chiSquare
  const testedWindows = windows.p_values.filter((p) => p !== null).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="space-y-4 rounded-2xl border bg-card/80 p-4"
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONES[tone])}>
          <FileAudio className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="truncate text-sm font-medium" title={analysis.file.name}>
            {analysis.file.name}
          </div>
        </div>
      </div>

      <ReportBlock
        title="Chi-square toàn file"
        badge={<VerdictBadge verdict={chiSquareVerdict(whole.p_value)} />}
      >
        <dl className="grid grid-cols-2 gap-2">
          <Figure
            label="χ²"
            value={whole.statistic === null ? '—' : formatStatistic(whole.statistic)}
          />
          <Figure
            label="p-value"
            value={whole.p_value === null ? '—' : formatPValue(whole.p_value)}
            strong
          />
        </dl>
      </ReportBlock>

      <ReportBlock title="Chi-square theo từng đoạn">
        <dl className="grid grid-cols-2 gap-2">
          <Figure
            label="Đoạn bị phát hiện"
            value={
              windows.detected_fraction === null ? '—' : formatPercent(windows.detected_fraction)
            }
            strong
          />
          <Figure
            label="Đoạn kiểm tra được"
            value={`${formatInt(testedWindows)}/${formatInt(windows.p_values.length)}`}
          />
        </dl>
      </ReportBlock>

      <ReportBlock title="RS Analysis">
        <div className="space-y-3">
          <Figure
            label="Tỉ lệ giấu tin ước tính"
            value={
              analysis.rs.estimated_rate === null
                ? 'Không ước tính được'
                : formatPercent(analysis.rs.estimated_rate)
            }
            strong
          />
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground transition-colors select-none hover:text-foreground">
              Xem chỉ số R/S
            </summary>
            <RsTable original={analysis.rs.original} flipped={analysis.rs.flipped} />
          </details>
        </div>
      </ReportBlock>
    </motion.div>
  )
}

function ReportBlock({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {badge}
      </div>
      {children}
    </div>
  )
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('truncate tabular', strong ? 'text-base font-semibold' : 'text-sm')}>
        {value}
      </dd>
    </div>
  )
}

const RS_ROWS: { key: keyof RsCountsModel; label: string }[] = [
  { key: 'regular', label: 'R_M' },
  { key: 'singular', label: 'S_M' },
  { key: 'regular_negative', label: 'R_−M' },
  { key: 'singular_negative', label: 'S_−M' },
]

function RsTable({ original, flipped }: { original: RsCountsModel; flipped: RsCountsModel }) {
  const cell = (value: number | null) => (value === null ? '—' : formatPercent(value, 2))
  return (
    <table className="w-full text-xs tabular">
      <thead className="text-muted-foreground">
        <tr>
          <th className="py-1 text-left font-normal">Nhóm</th>
          <th className="py-1 text-right font-normal">Gốc</th>
          <th className="py-1 text-right font-normal">Lật LSB</th>
        </tr>
      </thead>
      <tbody>
        {RS_ROWS.map(({ key, label }) => (
          <tr key={key} className="border-t border-border/60">
            <td className="py-1 font-mono">{label}</td>
            <td className="py-1 text-right">{cell(original[key])}</td>
            <td className="py-1 text-right">{cell(flipped[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
