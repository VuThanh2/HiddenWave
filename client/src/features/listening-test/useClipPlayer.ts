import { useCallback, useEffect, useRef, useState } from 'react'

import type { Reference } from './abx'

export interface Clip {
  start: number
  length: number
}

interface PlayerState<K extends string> {
  playing: K | null
  progress: number
}

/**
 * Phát đúng một đoạn [start, start + length) của bản A hoặc B. Phím X dùng lại chính phần tử audio
 * của bản nó trỏ tới, nên độ trễ khi phát không để lộ đáp án.
 */
export function useClipPlayer<K extends string>(
  urlA: string | undefined,
  urlB: string | undefined,
  clip: Clip,
) {
  const elements = useRef<Partial<Record<Reference, HTMLAudioElement>>>({})
  const frame = useRef(0)
  const playSession = useRef(0)
  const [state, setState] = useState<PlayerState<K>>({ playing: null, progress: 0 })

  useEffect(() => {
    const urls: Record<Reference, string | undefined> = { A: urlA, B: urlB }
    const created: HTMLAudioElement[] = []
    for (const reference of ['A', 'B'] as const) {
      const url = urls[reference]
      if (!url) continue
      const audio = new Audio(url)
      audio.preload = 'auto'
      elements.current[reference] = audio
      created.push(audio)
    }
    return () => {
      cancelAnimationFrame(frame.current)
      created.forEach((audio) => audio.pause())
      elements.current = {}
    }
  }, [urlA, urlB])

  const stop = useCallback(() => {
    playSession.current++
    cancelAnimationFrame(frame.current)
    Object.values(elements.current).forEach((audio) => audio.pause())
    setState({ playing: null, progress: 0 })
  }, [])

  const play = useCallback(
    async (key: K, reference: Reference) => {
      stop()
      const audio = elements.current[reference]
      if (!audio) return
      const end = clip.start + clip.length
      audio.currentTime = clip.start
      // Hiện trạng thái ngay, không chờ play() (có thể mất một nhịp khi audio chưa tải xong).
      setState({ playing: key, progress: 0 })
      const session = ++playSession.current
      try {
        await audio.play()
      } catch {
        if (session === playSession.current) stop()
        return
      }
      if (session !== playSession.current) return

      const tick = () => {
        const progress = (audio.currentTime - clip.start) / clip.length
        if (audio.currentTime >= end || audio.ended) {
          stop()
          return
        }
        setState({ playing: key, progress: Math.min(Math.max(progress, 0), 1) })
        frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
    },
    [clip.start, clip.length, stop],
  )

  return { ...state, play, stop }
}
