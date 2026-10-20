import { SegmentedControl } from '@/components/SegmentedControl'
import { formatNumber } from '@/lib/format'

import { WINDOW_SECONDS } from './verdict'

interface Props {
  value: number
  onChange: (seconds: number) => void
  disabled?: boolean
}

export function WindowPicker({ value, onChange, disabled }: Props) {
  return (
    <SegmentedControl
      size="sm"
      aria-label="Kích thước cửa sổ"
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      options={WINDOW_SECONDS.map((seconds) => ({
        value: String(seconds),
        label: `${formatNumber(seconds)} s`,
        disabled,
      }))}
    />
  )
}
