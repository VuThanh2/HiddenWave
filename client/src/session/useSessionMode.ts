import { useState } from 'react'

import type { StegoMode } from '@/api/types'

import { useSession } from './session-context'

/**
 * Mode điền sẵn từ phiên. Lựa chọn tay chỉ gắn với file đang chọn, nên khi phiên có stego mới
 * (vd vừa encode bằng mode khác) màn hình lại theo mode của phiên.
 */
export function useSessionMode(file: File | null): [StegoMode, (mode: StegoMode) => void] {
  const session = useSession()
  const [choice, setChoice] = useState<{ file: File | null; mode: StegoMode } | null>(null)
  const mode = choice && choice.file === file ? choice.mode : session.mode
  return [mode, (next) => setChoice({ file, mode: next })]
}
