import { useCallback, useState } from 'react'

import { probeWav } from '@/api/probe'
import type { CapacityResponse } from '@/api/types'
import { useWavProbe, type WavProbe } from '@/hooks/useWavProbe'

import { useSession, type FileRole, type SessionFile } from './session-context'

export interface SlotFile {
  role: FileRole
  file: File | null
  probe: WavProbe
  /** Thông tin audio khi file đã được engine chấp nhận; trang chỉ nên chạy tác vụ khi có giá trị này. */
  info: CapacityResponse | null
  origin: SessionFile['origin'] | null
  /** File trong phiên khác với file đang hiện ở ô này, để gợi ý dùng lại. */
  sessionAlternative: File | null
  select: (file: File) => void
  restore: () => void
  clear: () => void
}

interface Options {
  /** Tắt cho màn hình không được gọi API (Listening Test). */
  probe?: boolean
}

/**
 * Ô nạp file đi theo file trong phiên, nên các màn hình tự điền sẵn khi phiên đổi. File mới chỉ vào
 * phiên sau khi engine xác nhận hợp lệ, để một file hỏng không đè mất stego vừa tạo.
 */
export function useSlotFile(
  role: FileRole,
  { probe: probeEnabled = true }: Options = {},
): SlotFile {
  const session = useSession()
  const { setFile } = session
  const [candidate, setCandidate] = useState<File | null>(null)
  const [hidden, setHidden] = useState<File | null>(null)

  const entry = session[role]
  const sessionFile = entry?.file ?? null
  const isHidden = sessionFile !== null && sessionFile === hidden
  const file = candidate ?? (isHidden ? null : sessionFile)
  const probe = useWavProbe(probeEnabled ? file : null)

  const select = useCallback(
    (next: File) => {
      setHidden(null)
      if (!probeEnabled) {
        setCandidate(null)
        setFile(role, next)
        return
      }
      setCandidate(next)
      probeWav(next).then(
        () => {
          setFile(role, next)
          setCandidate((current) => (current === next ? null : current))
        },
        () => undefined,
      )
    },
    [probeEnabled, role, setFile],
  )

  const restore = useCallback(() => {
    setCandidate(null)
    setHidden(null)
  }, [])

  const clear = useCallback(() => {
    setCandidate(null)
    setHidden(sessionFile)
  }, [sessionFile])

  return {
    role,
    file,
    probe,
    info: probe.status === 'ready' ? probe.info : null,
    origin: file !== null && file === sessionFile ? (entry?.origin ?? null) : null,
    sessionAlternative: sessionFile !== file ? sessionFile : null,
    select,
    restore,
    clear,
  }
}
