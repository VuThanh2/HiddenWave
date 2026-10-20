import { useEffect, useState } from 'react'

import type { ApiError } from '@/api/client'
import { toApiError } from '@/api/errorCopy'
import { probeWav } from '@/api/probe'
import type { CapacityResponse } from '@/api/types'

export type WavProbe =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'ready'; info: CapacityResponse }
  | { status: 'invalid'; error: ApiError }

interface ProbeResult {
  file: File
  probe: WavProbe
}

export function useWavProbe(file: File | null | undefined): WavProbe {
  const [result, setResult] = useState<ProbeResult | null>(null)

  useEffect(() => {
    if (!file) return
    let active = true
    probeWav(file).then(
      (info) => active && setResult({ file, probe: { status: 'ready', info } }),
      (error: unknown) =>
        active && setResult({ file, probe: { status: 'invalid', error: toApiError(error) } }),
    )
    return () => {
      active = false
    }
  }, [file])

  if (!file) return { status: 'empty' }
  // Kết quả của file trước còn nằm trong state cho tới khi probe mới xong.
  return result?.file === file ? result.probe : { status: 'loading' }
}
