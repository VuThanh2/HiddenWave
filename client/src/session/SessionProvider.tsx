import { useCallback, useMemo, useState, type ReactNode } from 'react'

import type { StegoMode } from '@/api/types'

import { SessionContext, type FileRole, type Session, type SessionApi } from './session-context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ mode: 'classic' })

  const setFile = useCallback<SessionApi['setFile']>((role, file, origin = 'uploaded') => {
    setSession((current) => ({ ...current, [role]: { file, origin } }))
  }, [])

  const clearFile = useCallback((role: FileRole) => {
    setSession((current) => ({ ...current, [role]: undefined }))
  }, [])

  const setMode = useCallback((mode: StegoMode) => {
    setSession((current) => (current.mode === mode ? current : { ...current, mode }))
  }, [])

  const value = useMemo(
    () => ({ ...session, setFile, clearFile, setMode }),
    [session, setFile, clearFile, setMode],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
