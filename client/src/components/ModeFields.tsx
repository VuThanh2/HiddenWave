import { Eye, EyeOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState, type ReactNode, type Ref } from 'react'

import type { StegoMode } from '@/api/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MODE_META } from '@/lib/modes'
import { cn } from '@/lib/utils'

const MODES: StegoMode[] = ['classic', 'hardened']

const TONE_CLASSES: Record<StegoMode, { ring: string; icon: string; glow: string }> = {
  classic: {
    ring: 'border-classic/60 ring-classic/20',
    icon: 'bg-classic/15 text-classic',
    glow: 'from-classic/10',
  },
  hardened: {
    ring: 'border-hardened/60 ring-hardened/20',
    icon: 'bg-hardened/15 text-hardened',
    glow: 'from-hardened/10',
  },
}

interface Props {
  mode: StegoMode
  onModeChange: (mode: StegoMode) => void
  passphrase: string
  onPassphraseChange: (passphrase: string) => void
  /** Nội dung phụ dưới mỗi lựa chọn mode, vd capacity ở màn Encode. */
  modeDetail?: (mode: StegoMode) => ReactNode
  modeHint?: ReactNode
  passphraseRef?: Ref<HTMLInputElement>
  passphraseInvalid?: boolean
  disabled?: boolean
}

export function ModeFields({
  mode,
  onModeChange,
  passphrase,
  onPassphraseChange,
  modeDetail,
  modeHint,
  passphraseRef,
  passphraseInvalid,
  disabled,
}: Props) {
  const inputId = useId()
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="@container space-y-3">
      {modeHint && <p className="text-xs text-muted-foreground">{modeHint}</p>}
      <div role="radiogroup" aria-label="Chế độ" className="grid gap-2 @sm:grid-cols-2">
        {MODES.map((value) => {
          const meta = MODE_META[value]
          const tone = TONE_CLASSES[value]
          const selected = value === mode
          const Icon = meta.icon
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onModeChange(value)}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-card p-3 text-left transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60',
                selected
                  ? cn('ring-3', tone.ring)
                  : 'border-border hover:border-foreground/20 hover:bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 bg-linear-to-br to-transparent opacity-0 transition-opacity duration-300',
                  tone.glow,
                  selected && 'opacity-100',
                )}
              />
              <span className="relative flex items-start gap-3">
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
                    selected ? tone.icon : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{meta.label}</span>
                    <span
                      className={cn(
                        'size-3.5 rounded-full border-2 transition-all',
                        selected ? 'border-[5px] border-current text-foreground' : 'border-input',
                      )}
                    />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {meta.summary}
                  </span>
                  {modeDetail && <span className="mt-2 block">{modeDetail(value)}</span>}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {mode === 'hardened' && (
          <motion.div
            key="passphrase"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              <Label htmlFor={inputId}>Passphrase</Label>
              <div className="relative">
                <Input
                  ref={passphraseRef}
                  id={inputId}
                  type={revealed ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(event) => onPassphraseChange(event.target.value)}
                  placeholder="Nhập passphrase"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  aria-invalid={passphraseInvalid || undefined}
                  className="h-9 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setRevealed((value) => !value)}
                  className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={revealed ? 'Ẩn passphrase' : 'Hiện passphrase'}
                >
                  {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Passphrase không được lưu lại. Cần nhập đúng passphrase này khi giải mã.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
