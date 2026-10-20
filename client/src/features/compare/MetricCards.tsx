import { Activity, BadgeCheck, Equal, Sigma, Waves } from 'lucide-react'

import type { DistortionModel } from '@/api/types'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { StatTile } from '@/components/StatTile'
import { formatDecimal, formatInt, formatPercent } from '@/lib/format'

// MSE ≤ 1 khi mỗi mẫu lệch tối đa ±1 → PSNR ≥ 20·log10(32767) ≈ 90.31 dB.
const PSNR_FLOOR_DB = 90.31

export function MetricCards({ metrics }: { metrics: DistortionModel }) {
  const identical = metrics.psnr_db === null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        emphasis
        icon={Waves}
        label="PSNR"
        value={
          identical ? (
            <span className="flex items-center gap-1.5">
              <Equal className="size-5 text-success" /> Giống hệt
            </span>
          ) : (
            <>
              <AnimatedNumber
                value={metrics.psnr_db ?? 0}
                format={(value) => formatDecimal(value, 2)}
              />
              <span className="text-sm font-normal text-muted-foreground"> dB</span>
            </>
          )
        }
        sub={
          identical ? (
            'Hai file hoàn toàn giống nhau'
          ) : (metrics.psnr_db ?? 0) >= PSNR_FLOOR_DB ? (
            <span className="flex items-center gap-1 text-success">
              <BadgeCheck className="size-3.5" /> Rất cao — sai khác cực nhỏ
            </span>
          ) : (
            <span className="text-destructive">Thấp hơn mức mong đợi</span>
          )
        }
      />
      <StatTile
        icon={Sigma}
        label="MSE"
        value={<AnimatedNumber value={metrics.mse} format={(value) => formatDecimal(value, 6)} />}
        sub="Càng nhỏ càng giống"
      />
      <StatTile
        icon={Activity}
        label="Mẫu bị thay đổi"
        value={
          <AnimatedNumber
            value={metrics.changed_samples}
            format={(value) => formatInt(Math.round(value))}
          />
        }
        sub={`/ ${formatInt(metrics.total_samples)} mẫu`}
      />
      <StatTile
        label="Tỉ lệ bị đổi"
        value={
          <AnimatedNumber value={metrics.change_rate} format={(value) => formatPercent(value, 3)} />
        }
        sub="Trên toàn bộ file"
      />
    </div>
  )
}
