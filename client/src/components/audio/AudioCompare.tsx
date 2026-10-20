import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import WaveSurfer from 'wavesurfer.js'

import { usePageActive } from '@/app/page-activity'
import { useChartPalette, withAlpha } from '@/components/charts/chart-theme'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { fileKey } from '@/lib/fileKey'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

type Source = 'cover' | 'stego'

const SOURCES: Source[] = ['cover', 'stego']
const SEEK_STEP_SECONDS = 5

interface Props {
  cover: File
  stego: File
}

/**
 * Hai bản phát song song, chỉ bản đang chọn được bật tiếng: chuyển cover ↔ stego là tức thì và
 * đúng vị trí, nên tai so sánh được cùng một đoạn nhạc.
 */
export function AudioCompare({ cover, stego }: Props) {
  return <CompareDeck key={`${fileKey(cover)}:${fileKey(stego)}`} cover={cover} stego={stego} />
}

function CompareDeck({ cover, stego }: Props) {
  const palette = useChartPalette()
  const pageActive = usePageActive()
  const containers = useRef<Record<Source, HTMLDivElement | null>>({ cover: null, stego: null })
  const players = useRef<Partial<Record<Source, WaveSurfer>>>({})
  const [audible, setAudible] = useState<Source>('cover')
  const audibleRef = useRef<Source>('cover')
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(0)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const files: Record<Source, File> = { cover, stego }
    const created: WaveSurfer[] = []

    for (const source of SOURCES) {
      const container = containers.current[source]
      if (!container) continue
      const player = WaveSurfer.create({
        container,
        height: 64,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        cursorWidth: 2,
        dragToSeek: true,
        hideScrollbar: true,
        normalize: true,
      })
      player.setMuted(source !== audibleRef.current)
      player.on('ready', (seconds) => {
        setReady((count) => count + 1)
        if (source === 'cover') setDuration(seconds)
      })
      player.on('timeupdate', (seconds) => {
        if (source === audibleRef.current) setTime(seconds)
      })
      // Người dùng bấm/kéo trên một waveform thì đưa bản còn lại về cùng vị trí.
      player.on('interaction', (seconds) => {
        for (const other of SOURCES) {
          if (other !== source) players.current[other]?.setTime(seconds)
        }
        setTime(seconds)
      })
      if (source === 'cover') {
        player.on('play', () => setPlaying(true))
        player.on('pause', () => setPlaying(false))
      }
      void player.loadBlob(files[source])
      players.current[source] = player
      created.push(player)
    }

    return () => {
      created.forEach((player) => player.destroy())
      players.current = {}
    }
  }, [cover, stego])

  useEffect(() => {
    const colors: Record<Source, string> = { cover: palette.cover, stego: palette.stego }
    for (const source of SOURCES) {
      players.current[source]?.setOptions({
        waveColor: withAlpha(colors[source], 0.35),
        progressColor: colors[source],
        cursorColor: palette.text,
      })
    }
  }, [palette, ready])

  const pause = useCallback(() => {
    SOURCES.forEach((source) => players.current[source]?.pause())
  }, [])

  useEffect(() => {
    if (!pageActive) pause()
  }, [pageActive, pause])

  const allReady = ready >= SOURCES.length

  const play = async () => {
    const current = players.current[audibleRef.current]?.getCurrentTime() ?? 0
    SOURCES.forEach((source) => players.current[source]?.setTime(current))
    await Promise.all(SOURCES.map((source) => players.current[source]?.play()))
  }

  const togglePlay = () => (playing ? pause() : void play())

  const switchTo = (next: Source) => {
    const from = players.current[audibleRef.current]
    const to = players.current[next]
    if (!from || !to || next === audibleRef.current) return
    to.setTime(from.getCurrentTime())
    from.setMuted(true)
    to.setMuted(false)
    audibleRef.current = next
    setAudible(next)
  }

  const seekBy = (delta: number) => {
    const target = Math.min(Math.max(time + delta, 0), duration)
    SOURCES.forEach((source) => players.current[source]?.setTime(target))
    setTime(target)
  }

  const restart = () => {
    SOURCES.forEach((source) => players.current[source]?.setTime(0))
    setTime(0)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!allReady) return
    const actions: Record<string, () => void> = {
      ' ': togglePlay,
      ArrowLeft: () => seekBy(-SEEK_STEP_SECONDS),
      ArrowRight: () => seekBy(SEEK_STEP_SECONDS),
      x: () => switchTo(audible === 'cover' ? 'stego' : 'cover'),
    }
    const action = actions[event.key]
    if (action) {
      event.preventDefault()
      action()
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="space-y-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      aria-label="Trình phát so sánh cover và stego"
    >
      <div className="space-y-2">
        {SOURCES.map((source) => (
          <div
            key={source}
            onClick={() => switchTo(source)}
            className={cn(
              'group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2 pr-3 transition-all duration-300',
              audible === source
                ? source === 'cover'
                  ? 'border-cover/40 bg-cover/5'
                  : 'border-stego/40 bg-stego/5'
                : 'border-transparent opacity-55 hover:opacity-80',
            )}
          >
            <span
              className={cn(
                'w-14 shrink-0 text-center text-xs font-semibold tracking-wide uppercase',
                source === 'cover' ? 'text-cover' : 'text-stego',
              )}
            >
              {source}
            </span>
            <div className="relative min-w-0 flex-1">
              <div ref={(node) => void (containers.current[source] = node)} />
              {!allReady && <div className="absolute inset-0 animate-pulse rounded-md bg-muted" />}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="icon-lg"
          className="rounded-full"
          onClick={togglePlay}
          disabled={!allReady}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
        >
          {playing ? (
            <Pause className="fill-current" />
          ) : (
            <Play className="translate-x-px fill-current" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={restart}
          disabled={!allReady}
          aria-label="Về đầu"
        >
          <RotateCcw />
        </Button>
        <span className="font-mono text-xs text-muted-foreground tabular">
          {formatDuration(time)} / {formatDuration(duration)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Đang nghe</span>
          <SegmentedControl
            size="sm"
            aria-label="Nguồn đang nghe"
            value={audible}
            onChange={switchTo}
            options={[
              { value: 'cover', label: <span className="text-cover">Cover</span> },
              { value: 'stego', label: <span className="text-stego">Stego</span> },
            ]}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Phím tắt: <kbd className="font-mono">Space</kbd> phát/dừng ·{' '}
        <kbd className="font-mono">X</kbd> đổi file · <kbd className="font-mono">← →</kbd> tua 5
        giây
      </p>
    </div>
  )
}
