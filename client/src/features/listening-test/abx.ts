import type { Clip } from './useClipPlayer'

export type Reference = 'A' | 'B'

export interface Trial {
  /** X thực chất là bản nào; chỉ lộ ra ở bước kết quả. */
  x: Reference
  answer?: Reference
}

export const SIGNIFICANCE = 0.05
export const TRIAL_COUNTS = [8, 12, 16, 20]
export const CLIP_LENGTHS = [4, 8, 15]

export interface AbxSettings {
  trialCount: number
  clip: Clip
}

export function createTrials(count: number): Trial[] {
  const random = new Uint8Array(count)
  crypto.getRandomValues(random)
  return Array.from(random, (value) => ({ x: value & 1 ? 'A' : 'B' }))
}

export function countCorrect(trials: Trial[]): number {
  return trials.filter((trial) => trial.answer === trial.x).length
}

/** P(K ≥ correct) với K ~ Binomial(total, 0.5): xác suất đoán bừa mà vẫn đúng từng ấy lượt. */
export function binomialPValue(correct: number, total: number): number {
  let coefficient = 1
  let tail = correct === 0 ? 1 : 0
  for (let k = 1; k <= total; k++) {
    coefficient = (coefficient * (total - k + 1)) / k
    if (k >= correct) tail += coefficient
  }
  return Math.min(1, tail / 2 ** total)
}
