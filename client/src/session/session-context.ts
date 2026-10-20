import { createContext, useContext } from 'react'

import type { StegoMode } from '@/api/types'

export type FileRole = 'cover' | 'stego'

export interface SessionFile {
  file: File
  /** `encoded`: sinh ra từ màn Encode trong phiên này; `uploaded`: người dùng tự nạp. */
  origin: 'encoded' | 'uploaded'
}

export interface Session {
  cover?: SessionFile
  stego?: SessionFile
  /** Mode của lần encode/decode gần nhất, để các màn hình điền sẵn. Không bao giờ giữ passphrase. */
  mode: StegoMode
}

export interface SessionApi extends Session {
  setFile: (role: FileRole, file: File, origin?: SessionFile['origin']) => void
  clearFile: (role: FileRole) => void
  setMode: (mode: StegoMode) => void
}

export const SessionContext = createContext<SessionApi | null>(null)

export function useSession(): SessionApi {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside SessionProvider')
  return session
}
