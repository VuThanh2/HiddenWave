import { useEffect, useState } from 'react'

export type AudioDuration =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'ready'; seconds: number }
  | { status: 'error' }

/** Đọc thời lượng bằng chính trình duyệt, kiêm luôn kiểm tra file có phát được hay không. */
export function useAudioDuration(url: string | undefined): AudioDuration {
  const [result, setResult] = useState<{ url: string; duration: AudioDuration } | null>(null)

  useEffect(() => {
    if (!url) return
    const audio = new Audio()
    audio.preload = 'metadata'
    const onLoaded = () =>
      setResult({ url, duration: { status: 'ready', seconds: audio.duration } })
    const onError = () => setResult({ url, duration: { status: 'error' } })
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('error', onError)
    audio.src = url
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('error', onError)
      audio.removeAttribute('src')
    }
  }, [url])

  if (!url) return { status: 'empty' }
  return result?.url === url ? result.duration : { status: 'loading' }
}
