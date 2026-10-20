// Cùng ngưỡng với DETECTION_P_VALUE của engine (analysis/chi_square.py), để nhãn trên UI khớp với
// detected_fraction mà engine tính.
export const DETECTION_P_VALUE = 0.95

export type Verdict = 'detected' | 'clean' | 'unreliable'

export function chiSquareVerdict(pValue: number | null): Verdict {
  if (pValue === null) return 'unreliable'
  return pValue >= DETECTION_P_VALUE ? 'detected' : 'clean'
}

export const VERDICT_COPY: Record<Verdict, { label: string; tone: string }> = {
  detected: { label: 'Có dấu hiệu giấu tin', tone: 'bg-destructive/12 text-destructive' },
  clean: { label: 'Không phát hiện', tone: 'bg-success/12 text-success' },
  unreliable: { label: 'Không đủ dữ liệu', tone: 'bg-muted text-muted-foreground' },
}

/** Các cỡ cửa sổ trượt cho người dùng chọn, tính theo giây âm thanh. */
export const WINDOW_SECONDS = [0.25, 0.5, 1, 2, 5] as const
export const DEFAULT_WINDOW_SECONDS = 1
// Khớp MIN_WINDOW_SIZE của API: cửa sổ nhỏ hơn bị từ chối.
const MIN_WINDOW_SAMPLES = 1024

export function windowSamples(seconds: number, samplesPerSecond: number): number {
  return Math.max(MIN_WINDOW_SAMPLES, Math.round(seconds * samplesPerSecond))
}
