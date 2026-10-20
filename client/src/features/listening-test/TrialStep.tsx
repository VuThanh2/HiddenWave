import { Pause, Play, X as Close } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

import { usePageActive } from '@/app/page-activity'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Reference, Trial } from './abx'
import { useClipPlayer, type Clip } from './useClipPlayer'

type Track = 'A' | 'B' | 'X'

interface Props {
  trials: Trial[]
  index: number
  urls: Record<Reference, string>
  clip: Clip
  onAnswer: (answer: Reference) => void
  onQuit: () => void
}

const PLAY_KEYS: Record<string, Track> = { a: 'A', b: 'B', x: 'X' }
const ANSWER_KEYS: Record<string, Reference> = {
  ArrowLeft: 'A',
  ArrowRight: 'B',
  '1': 'A',
  '2': 'B',
}

export function TrialStep({ trials, index, urls, clip, onAnswer, onQuit }: Props) {
  const pageActive = usePageActive()
  const player = useClipPlayer<Track>(urls.A, urls.B, clip)
  const trial = trials[index]
  const { play, stop, playing } = player

  const toggle = (track: Track) => {
    if (playing === track) stop()
    else void play(track, track === 'X' ? trial.x : track)
  }

  const answer = (reference: Reference) => {
    stop()
    onAnswer(reference)
  }

  useEffect(() => {
    if (!pageActive) stop()
  }, [pageActive, stop])

  useEffect(() => {
    if (!pageActive) return
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.repeat) return
      const track = PLAY_KEYS[event.key.toLowerCase()]
      const reference = ANSWER_KEYS[event.key]
      if (track) {
        event.preventDefault()
        if (playing === track) stop()
        else void play(track, track === 'X' ? trial.x : track)
      } else if (reference) {
        event.preventDefault()
        stop()
        onAnswer(reference)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pageActive, playing, play, stop, trial.x, onAnswer])

  return (
    <div className="space-y-6 rounded-2xl border bg-card/80 p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Lượt</div>
          <div className="text-2xl font-semibold tabular">
            {index + 1}
            <span className="text-base font-normal text-muted-foreground"> / {trials.length}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onQuit}>
          <Close /> Dừng bài thử
        </Button>
      </div>

      <div className="flex gap-1">
        {trials.map((item, position) => (
          <span
            key={position}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              item.answer ? 'bg-primary' : position === index ? 'bg-primary/40' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-3">
            {(['A', 'B', 'X'] as const).map((track) => (
              <TrackButton
                key={track}
                track={track}
                active={playing === track}
                progress={playing === track ? player.progress : 0}
                onClick={() => toggle(track)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">X giống bản nào?</p>
            <div className="grid grid-cols-2 gap-3">
              {(['A', 'B'] as const).map((reference) => (
                <Button
                  key={reference}
                  variant="outline"
                  className="h-12 text-base"
                  onClick={() => answer(reference)}
                >
                  X = {reference}
                  <kbd className="ml-2 hidden rounded border px-1 font-sans text-[10px] text-muted-foreground sm:inline">
                    {reference === 'A' ? '←' : '→'}
                  </kbd>
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground">
        Phím tắt: <kbd className="font-mono">A</kbd> <kbd className="font-mono">B</kbd>{' '}
        <kbd className="font-mono">X</kbd> để phát/dừng · <kbd className="font-mono">←</kbd>{' '}
        <kbd className="font-mono">→</kbd> để trả lời
      </p>
    </div>
  )
}

interface TrackButtonProps {
  track: Track
  active: boolean
  progress: number
  onClick: () => void
}

function TrackButton({ track, active, progress, onClick }: TrackButtonProps) {
  const unknown = track === 'X'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border text-center transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:aspect-[4/3]',
        active
          ? 'border-primary bg-primary/8 shadow-[0_0_0_4px] shadow-primary/10'
          : 'hover:border-foreground/25 hover:bg-muted/40',
        unknown && !active && 'border-dashed',
      )}
      aria-label={`${active ? 'Dừng' : 'Phát'} ${track}`}
    >
      <span className={cn('text-3xl font-semibold sm:text-4xl', unknown && 'text-primary')}>
        {track}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {active ? 'Đang phát' : unknown ? 'Cần đoán' : 'Bấm để nghe'}
      </span>
      <span
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-primary"
        style={{ transform: `scaleX(${progress})` }}
      />
    </button>
  )
}
