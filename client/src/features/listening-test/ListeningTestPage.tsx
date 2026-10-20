import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { useAudioDuration } from '@/hooks/useAudioDuration'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSlotFile } from '@/session/useSlotFile'

import { createTrials, type AbxSettings, type Reference, type Trial } from './abx'
import { ResultStep } from './ResultStep'
import { SetupStep } from './SetupStep'
import { Stepper } from './Stepper'
import { TrialStep } from './TrialStep'

type Phase =
  | { step: 'setup' }
  | { step: 'trial'; trials: Trial[]; index: number }
  | { step: 'result'; trials: Trial[] }

const STEP_INDEX = { setup: 0, trial: 1, result: 2 } as const

export function ListeningTestPage() {
  // Toàn bộ bài thử tính ở client: không probe qua API, trình duyệt tự kiểm tra file phát được không.
  const cover = useSlotFile('cover', { probe: false })
  const stego = useSlotFile('stego', { probe: false })
  const coverUrl = useObjectUrl(cover.file)
  const stegoUrl = useObjectUrl(stego.file)
  const coverDuration = useAudioDuration(coverUrl)
  const stegoDuration = useAudioDuration(stegoUrl)
  const [settings, setSettings] = useState<AbxSettings>({
    trialCount: 16,
    clip: { start: 0, length: 8 },
  })
  const [phase, setPhase] = useState<Phase>({ step: 'setup' })

  const start = () => {
    const duration =
      coverDuration.status === 'ready' && stegoDuration.status === 'ready'
        ? Math.min(coverDuration.seconds, stegoDuration.seconds)
        : 0
    const length = Math.min(settings.clip.length, duration)
    const clip = { length, start: Math.min(settings.clip.start, Math.max(0, duration - length)) }
    setSettings({ ...settings, clip })
    setPhase({ step: 'trial', trials: createTrials(settings.trialCount), index: 0 })
  }

  const answer = useCallback((reference: Reference) => {
    setPhase((current) => {
      if (current.step !== 'trial') return current
      const trials = current.trials.map((trial, index) =>
        index === current.index ? { ...trial, answer: reference } : trial,
      )
      return current.index + 1 < trials.length
        ? { step: 'trial', trials, index: current.index + 1 }
        : { step: 'result', trials }
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đánh giá · Nghe thử"
        title="Listening Test"
        description="Bạn có nghe ra đâu là file gốc, đâu là file đã giấu tin không? Làm bài nghe mù để kiểm chứng."
      />
      <Stepper current={STEP_INDEX[phase.step]} />

      <AnimatePresence mode="wait">
        <motion.div
          key={phase.step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {phase.step === 'setup' && (
            <SetupStep
              cover={cover}
              stego={stego}
              coverDuration={coverDuration}
              stegoDuration={stegoDuration}
              settings={settings}
              onSettingsChange={setSettings}
              onStart={start}
            />
          )}
          {phase.step === 'trial' && coverUrl && stegoUrl && (
            <TrialStep
              trials={phase.trials}
              index={phase.index}
              urls={{ A: coverUrl, B: stegoUrl }}
              clip={settings.clip}
              onAnswer={answer}
              onQuit={() => setPhase({ step: 'setup' })}
            />
          )}
          {phase.step === 'result' && (
            <ResultStep
              trials={phase.trials}
              onRetry={start}
              onSetup={() => setPhase({ step: 'setup' })}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
