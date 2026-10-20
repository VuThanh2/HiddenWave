import type { StegoAnalysisModel, SweepResponse } from '@/api/types'
import { ModeBadge } from '@/components/ModeBadge'
import { formatDecimal, formatInt, formatNumber, formatPercent, formatPValue } from '@/lib/format'

import { chiSquareVerdict } from './verdict'
import { VerdictBadge } from './VerdictBadge'

const UNRELIABLE = <span className="text-muted-foreground italic">không đủ dữ liệu</span>

export function SweepTable({ sweep }: { sweep: SweepResponse }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[46rem] text-xs tabular">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Mức</th>
            <th className="px-3 py-2 text-left font-medium">Mode</th>
            <th className="px-3 py-2 text-right font-medium">Thực tế</th>
            <th className="px-3 py-2 text-right font-medium">Dữ liệu</th>
            <th className="px-3 py-2 text-right font-medium">p-value χ²</th>
            <th className="px-3 py-2 text-left font-medium">Kết luận</th>
            <th className="px-3 py-2 text-right font-medium">Đoạn bị phát hiện</th>
            <th className="px-3 py-2 text-right font-medium">RS</th>
            <th className="px-3 py-2 text-right font-medium">PSNR</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t bg-muted/20">
            <td className="px-3 py-2 font-medium">0%</td>
            <td className="px-3 py-2 text-muted-foreground">File gốc (mốc)</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2 text-right">—</td>
            <AnalysisCells analysis={sweep.cover} />
            <td className="px-3 py-2 text-right">—</td>
          </tr>
          {sweep.points.map((point) => (
            <tr key={`${point.requested_rate}-${point.mode}`} className="border-t">
              <td className="px-3 py-2 font-medium">{formatNumber(point.requested_rate * 100)}%</td>
              <td className="px-3 py-2">
                <ModeBadge mode={point.mode} />
              </td>
              <td className="px-3 py-2 text-right">{formatPercent(point.embedding_rate, 2)}</td>
              <td className="px-3 py-2 text-right">{formatInt(point.payload_bytes)} B</td>
              <AnalysisCells analysis={point.analysis} />
              <td className="px-3 py-2 text-right">
                {point.psnr_db === null ? '∞' : `${formatDecimal(point.psnr_db, 2)} dB`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnalysisCells({ analysis }: { analysis: StegoAnalysisModel }) {
  const { p_value: pValue } = analysis.chi_square
  const detected = analysis.windows.detected_fraction
  const rs = analysis.rs
  return (
    <>
      <td className="px-3 py-2 text-right">
        {pValue === null ? UNRELIABLE : formatPValue(pValue)}
      </td>
      <td className="px-3 py-2">
        <VerdictBadge verdict={chiSquareVerdict(pValue)} />
      </td>
      <td className="px-3 py-2 text-right">
        {detected === null ? UNRELIABLE : formatPercent(detected)}
      </td>
      <td className="px-3 py-2 text-right">
        {!rs ? '—' : rs.estimated_rate === null ? UNRELIABLE : formatPercent(rs.estimated_rate)}
      </td>
    </>
  )
}
