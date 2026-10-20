import { useCallback, useEffect, useState } from 'react'

import { api } from '@/api/client'
import type { HealthResponse } from '@/api/types'

const ONLINE_POLL_MS = 15_000
const OFFLINE_POLL_MS = 3_000

export type HealthState =
  { status: 'checking' } | { status: 'online'; health: HealthResponse } | { status: 'offline' }

export function useHealth() {
  const [state, setState] = useState<HealthState>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api.health(controller.signal).then(
      (health) => setState({ status: 'online', health }),
      () => !controller.signal.aborted && setState({ status: 'offline' }),
    )
    return () => controller.abort()
  }, [attempt])

  const online = state.status === 'online'
  useEffect(() => {
    if (state.status === 'checking') return
    const timer = setTimeout(
      () => setAttempt((count) => count + 1),
      online ? ONLINE_POLL_MS : OFFLINE_POLL_MS,
    )
    return () => clearTimeout(timer)
  }, [state, online])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  return { ...state, retry }
}
