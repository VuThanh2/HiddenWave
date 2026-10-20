import { motion } from 'motion/react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { formatInt, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  usedBytes: number
  characters: number
  /** null khi chưa có cover hợp lệ. */
  capacityBytes: number | null
}

const WARNING_RATIO = 0.9

export function CapacityMeter({ usedBytes, characters, capacityBytes }: Props) {
  const ratio = capacityBytes ? usedBytes / capacityBytes : 0
  const exceeded = capacityBytes !== null && usedBytes > capacityBytes
  const warning = !exceeded && ratio >= WARNING_RATIO
  const multiByte = usedBytes > characters

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground tabular">
          {formatInt(characters)} ký tự ·{' '}
          <span className={cn('font-medium text-foreground', exceeded && 'text-destructive')}>
            {formatInt(usedBytes)} byte
          </span>
          {multiByte && (
            <span className="text-muted-foreground/80"> (chữ có dấu tốn 2–3 byte)</span>
          )}
        </span>
        <span className="text-muted-foreground tabular">
          {capacityBytes === null ? (
            'Chọn file cover để xem dung lượng'
          ) : (
            <>
              Tối đa{' '}
              <AnimatedNumber
                value={capacityBytes}
                format={(value) => formatInt(Math.round(value))}
                className="font-medium text-foreground"
              />{' '}
              byte
            </>
          )}
        </span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            exceeded ? 'bg-destructive' : warning ? 'bg-warning' : 'bg-primary',
          )}
          initial={false}
          animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        />
      </div>

      {capacityBytes !== null && (
        <div
          className={cn(
            'text-xs tabular transition-colors',
            exceeded ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {exceeded
            ? `Dài hơn ${formatInt(usedBytes - capacityBytes)} byte so với mức tối đa`
            : `Còn trống ${formatInt(capacityBytes - usedBytes)} byte (${formatPercent(1 - ratio)})`}
        </div>
      )}
    </div>
  )
}
