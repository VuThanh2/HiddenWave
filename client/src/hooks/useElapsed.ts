import { useEffect, useState } from 'react'

/** Số giây đã trôi qua kể từ khi `running` bật, cập nhật mỗi 100 ms. */
export function useElapsed(running: boolean): number {
  const [state, setState] = useState({ startedAt: 0, now: 0 })

  useEffect(() => {
    if (!running) return
    const startedAt = performance.now()
    const tick = () => setState({ startedAt, now: performance.now() })
    tick()
    const timer = setInterval(tick, 100)
    return () => clearInterval(timer)
  }, [running])

  return running ? (state.now - state.startedAt) / 1000 : 0
}
