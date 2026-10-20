const LOCALE = 'vi-VN'

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

export function formatInt(value: number): string {
  return integer.format(value)
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Số thập phân gọn, không ép số chữ số (0,25 · 0,5 · 1). */
export function formatNumber(value: number, maxDigits = 2): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: maxDigits })
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${formatDecimal(ratio * 100, digits)}%`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatInt(bytes)} B`
  if (bytes < 1024 ** 2) return `${formatDecimal(bytes / 1024, 1)} KB`
  return `${formatDecimal(bytes / 1024 ** 2, 1)} MB`
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = String(whole % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

export function formatSampleRate(hz: number): string {
  return `${formatDecimal(hz / 1000, hz % 1000 === 0 ? 0 : 1)} kHz`
}

export function formatChannels(channels: number): string {
  return channels === 1 ? 'Mono' : channels === 2 ? 'Stereo' : `${channels} kênh`
}

export function formatPValue(p: number): string {
  if (p === 0) return '0'
  if (p < 0.001) return p.toExponential(2).replace('.', ',')
  return formatDecimal(p, 4)
}

export function formatStatistic(value: number): string {
  return value >= 1e6 ? value.toExponential(3) : formatDecimal(value, 2)
}
