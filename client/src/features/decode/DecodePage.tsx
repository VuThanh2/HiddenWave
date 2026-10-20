import { FileSearch, KeyRound, SearchX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'

import { api } from '@/api/client'
import type { StegoMode } from '@/api/types'
import { ErrorNotice } from '@/components/ErrorNotice'
import { ModeFields } from '@/components/ModeFields'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SubmitButton } from '@/components/SubmitButton'
import { WavFileSlot } from '@/components/WavFileSlot'
import { useRequest } from '@/hooks/useRequest'
import { firstBlocker, passphraseBlocker, slotBlocker } from '@/lib/blockers'
import { useSession } from '@/session/session-context'
import { useSessionMode } from '@/session/useSessionMode'
import { useSlotFile } from '@/session/useSlotFile'

import { DecodedMessage } from './DecodedMessage'

interface DecodeRequest {
  stego: File
  mode: StegoMode
  passphrase: string
}

export function DecodePage() {
  const session = useSession()
  const stego = useSlotFile('stego')
  const [mode, setMode] = useSessionMode(stego.file)
  const [passphrase, setPassphrase] = useState('')
  const [submittedPassphrase, setSubmittedPassphrase] = useState('')
  const passphraseRef = useRef<HTMLInputElement>(null)

  const decode = useRequest(async (signal, request: DecodeRequest) => {
    const { message } = await api.decode(request, signal)
    return { message, mode: request.mode, file: request.stego }
  })

  const blocker = firstBlocker(slotBlocker(stego, 'stego'), passphraseBlocker(mode, passphrase))

  const submit = async () => {
    if (blocker || !stego.file) return
    setSubmittedPassphrase(passphrase)
    const result = await decode.run({ stego: stego.file, mode, passphrase })
    if (result) {
      session.setMode(result.mode)
      return
    }
    // Cảnh "sai passphrase rồi đúng": chọn sẵn passphrase để chỉ cần gõ lại.
    if (mode === 'hardened') {
      requestAnimationFrame(() => passphraseRef.current?.select())
    }
  }

  const { error, status } = decode
  // Kết quả của file trước không còn đúng khi người dùng đã đổi sang file khác.
  const result = decode.data?.file === stego.file ? decode.data : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sử dụng · Bước 2"
        title="Decode"
        description="Lấy lại message đã giấu trong file stego. Không cần file gốc."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Section step={1} title="File stego">
            <WavFileSlot slot={stego} />
          </Section>
          <Section step={2} title="Chế độ">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <ModeFields
                mode={mode}
                onModeChange={setMode}
                passphrase={passphrase}
                onPassphraseChange={setPassphrase}
                passphraseRef={passphraseRef}
                passphraseInvalid={
                  error?.code === 'authentication_failed' && passphrase === submittedPassphrase
                }
                modeHint="Chọn đúng chế độ đã dùng khi encode."
              />
              <SubmitButton
                label="Decode"
                loadingLabel="Đang giải mã…"
                icon={FileSearch}
                onClick={submit}
                loading={decode.isLoading}
                blockedReason={blocker}
              />
            </form>
          </Section>
        </div>

        <Section title="Message" className="min-h-72">
          <div className="space-y-4">
            <ErrorNotice
              error={error}
              icon={error?.code === 'authentication_failed' ? KeyRound : SearchX}
              hint={errorHint(error?.code)}
            />
            <AnimatePresence mode="wait">
              {result ? (
                <DecodedMessage
                  key={`${result.file.name}:${result.message}`}
                  message={result.message}
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
                    Message sẽ hiện ở đây sau khi Decode.
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

function errorHint(code: string | undefined) {
  switch (code) {
    case 'message_not_found':
      return 'File có thể không chứa message, hoặc đã được giấu bằng chế độ Hardened — thử đổi chế độ.'
    case 'authentication_failed':
      return (
        <ul className="list-inside list-disc space-y-0.5">
          <li>Sai passphrase</li>
          <li>File đã bị chỉnh sửa sau khi giấu tin</li>
          <li>File không chứa message, hoặc được giấu bằng chế độ Classic</li>
        </ul>
      )
    default:
      return undefined
  }
}
