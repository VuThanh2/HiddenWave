import { ShieldHalf, Wrench } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { api } from '@/api/client'
import type { StegoMode } from '@/api/types'
import { useEngineHealth } from '@/app/health-context'
import { ErrorNotice } from '@/components/ErrorNotice'
import { ModeFields } from '@/components/ModeFields'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SubmitButton } from '@/components/SubmitButton'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useRequest } from '@/hooks/useRequest'
import { firstBlocker, passphraseBlocker, slotBlocker } from '@/lib/blockers'
import { useSessionMode } from '@/session/useSessionMode'
import { useSlotFile } from '@/session/useSlotFile'

import { RobustnessResult } from './RobustnessResult'

// Engine decode trước khi nén: hai lỗi này nghĩa là đầu vào sai, không phải message mất sau MP3.
const INPUT_ERROR_CODES = new Set(['message_not_found', 'authentication_failed'])

interface RobustnessRequest {
  stego: File
  mode: StegoMode
  passphrase: string
}

export function RobustnessPage() {
  const health = useEngineHealth()
  const ffmpegAvailable = health?.ffmpeg_available ?? false
  const stego = useSlotFile('stego')
  const [mode, setMode] = useSessionMode(stego.file)
  const [passphrase, setPassphrase] = useState('')
  const [submittedPassphrase, setSubmittedPassphrase] = useState('')

  const roundTrip = useRequest(async (signal, request: RobustnessRequest) => ({
    response: await api.mp3RoundTrip(request, signal),
    mode: request.mode,
    file: request.stego,
  }))

  const blocker = firstBlocker(
    !ffmpegAvailable && 'Máy này chưa có FFmpeg',
    slotBlocker(stego, 'stego'),
    passphraseBlocker(mode, passphrase),
  )

  const submit = () => {
    if (blocker || !stego.file) return
    setSubmittedPassphrase(passphrase)
    void roundTrip.run({ stego: stego.file, mode, passphrase })
  }

  const { error, status } = roundTrip
  const result = roundTrip.data?.file === stego.file ? roundTrip.data : undefined
  const inputError = error !== undefined && INPUT_ERROR_CODES.has(error.code)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đánh giá · Độ bền"
        title="Robustness"
        description="Tin giấu có còn sau khi file bị nén sang MP3 không? Chuyển file sang MP3 rồi thử giải mã lại."
      />

      <AnimatePresence>
        {health && !ffmpegAvailable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/8 p-4 text-sm">
              <Wrench className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium">Tính năng này cần FFmpeg</p>
                <p className="text-muted-foreground">
                  Cài FFmpeg rồi khởi động lại engine. Các màn hình khác vẫn dùng bình thường.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="grid gap-6 transition-opacity lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={!ffmpegAvailable || undefined}
      >
        <div className="space-y-4">
          <Section step={1} title="File stego">
            <WavFileSlot slot={stego} disabled={!ffmpegAvailable} />
          </Section>
          <Section step={2} title="Chế độ" description="Chọn đúng chế độ đã dùng khi encode.">
            <div className="space-y-4">
              <ModeFields
                mode={mode}
                onModeChange={setMode}
                passphrase={passphrase}
                onPassphraseChange={setPassphrase}
                passphraseInvalid={
                  error?.code === 'authentication_failed' && passphrase === submittedPassphrase
                }
                disabled={!ffmpegAvailable}
              />
              <SubmitButton
                label="Chạy thử nén MP3"
                loadingLabel="Đang nén và giải mã…"
                icon={ShieldHalf}
                onClick={submit}
                loading={roundTrip.isLoading}
                blockedReason={blocker}
              />
            </div>
          </Section>
        </div>

        <Section title="Kết quả" className="min-h-72">
          <div className="space-y-4">
            <ErrorNotice
              error={error}
              title={inputError ? 'Không giải mã được file này' : undefined}
              hint={
                inputError
                  ? 'Kiểm tra lại chế độ và passphrase. Lỗi xảy ra trước khi nén, không phải do MP3.'
                  : undefined
              }
            />
            <AnimatePresence mode="wait">
              {result ? (
                <RobustnessResult
                  key={result.response.original_message + result.response.lsb_agreement}
                  result={result.response}
                  mode={result.mode}
                />
              ) : (
                (status === 'idle' || status === 'success') && (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    Kết quả sẽ hiện ở đây.
                  </motion.p>
                )
              )}
            </AnimatePresence>
          </div>
        </Section>
      </div>
    </div>
  )
}
