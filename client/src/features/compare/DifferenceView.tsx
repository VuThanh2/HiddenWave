import { motion } from 'motion/react'
import { useMemo } from 'react'

import type { DifferenceModel } from '@/api/types'
import { useChartPalette } from '@/components/charts/chart-theme'
import { formatInt, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

import { EnvelopeChart, type EnvelopeSeries } from './EnvelopeChart'

interface Props {
  difference: DifferenceModel
  channels: number
}

const Y_RANGE: [number, number] = [-1.6, 1.6]
const Y_TICKS = [-1, 0, 1]

export function DifferenceView({ difference, channels }: Props) {
  const palette = useChartPalette()
  const series = useMemo<EnvelopeSeries[]>(
    () => [
      { name: 'Stego − Cover', envelope: difference.envelope, color: palette.stego, style: 'band' },
    ],
    [difference.envelope, palette.stego],
  )

  const buckets = [
    { label: 'Giảm 1', count: difference.minus_one, tone: 'bg-cover' },
    { label: 'Không đổi', count: difference.zero, tone: 'bg-muted-foreground/30' },
    { label: 'Tăng 1', count: difference.plus_one, tone: 'bg-stego' },
    { label: 'Lệch nhiều hơn', count: difference.other, tone: 'bg-destructive' },
  ]
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0) || 1

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {buckets.map((bucket, index) =>
            bucket.count > 0 ? (
              <motion.div
                key={bucket.label}
                className={cn('h-full', bucket.tone)}
                initial={{ width: 0 }}
                animate={{ width: `${(bucket.count / total) * 100}%` }}
                transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null,
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="rounded-lg border bg-card/60 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('size-2 rounded-full', bucket.tone)} />
                {bucket.label}
              </div>
              <div className="font-semibold tabular">{formatInt(bucket.count)}</div>
              <div className="text-xs text-muted-foreground tabular">
                {formatPercent(bucket.count / total, 3)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <EnvelopeChart series={series} channels={channels} yRange={Y_RANGE} yTickValues={Y_TICKS} />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Mỗi mẫu chỉ lệch tối đa 1 đơn vị. Classic giấu tin dồn ở đầu file, Hardened rải đều khắp
        file nên khó bị phát hiện hơn.
      </p>
    </div>
  )
}
