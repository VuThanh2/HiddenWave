import { Check, RotateCcw, Settings2, X } from 'lucide-react'
import { motion } from 'motion/react'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Button } from '@/components/ui/button'
import { formatPercent, formatPValue } from '@/lib/format'
import { cn } from '@/lib/utils'

import { binomialPValue, countCorrect, SIGNIFICANCE, type Trial } from './abx'

interface Props {
  trials: Trial[]
  onRetry: () => void
  onSetup: () => void
}

export function ResultStep({ trials, onRetry, onSetup }: Props) {
  const correct = countCorrect(trials)
  const pValue = binomialPValue(correct, trials.length)
  const distinguishable = pValue < SIGNIFICANCE

  return (
    <div className="space-y-6 rounded-2xl border bg-card/80 p-5 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreRing correct={correct} total={trials.length} />
        <div className="space-y-3">
          <div
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-sm font-medium',
              distinguishable ? 'bg-destructive/12 text-destructive' : 'bg-success/12 text-success',
            )}
          >
            {distinguishable
              ? 'Bạn nghe ra được sự khác biệt'
              : 'Không nghe ra khác biệt (như đoán ngẫu nhiên)'}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">p-value</dt>
              <dd className="text-xl font-semibold tabular">{formatPValue(pValue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tỉ lệ đúng</dt>
              <dd className="text-xl font-semibold tabular">
                {formatPercent(correct / trials.length, 0)}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            p-value là khả năng đoán bừa mà vẫn đúng từng ấy lượt. Chỉ khi p &lt; {SIGNIFICANCE} mới
            kết luận là nghe ra được.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Chi tiết từng lượt</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {trials.map((trial, index) => {
            const right = trial.answer === trial.x
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.03 }}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border py-2 text-xs',
                  right
                    ? 'border-success/30 bg-success/8'
                    : 'border-destructive/30 bg-destructive/6',
                )}
              >
                <span className="text-muted-foreground tabular">#{index + 1}</span>
                <span className="flex items-center gap-1 font-medium">
                  {right ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <X className="size-3 text-destructive" />
                  )}
                  X={trial.x}
                </span>
              </motion.div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">A là cover, B là stego.</p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onSetup}>
          <Settings2 /> Đổi thiết lập
        </Button>
        <Button onClick={onRetry}>
          <RotateCcw /> Thử lại
        </Button>
      </div>
    </div>
  )
}

function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-muted" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          className="fill-none stroke-primary"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - correct / total) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* SVG đã xoay −90°, nên vạch đặt bên trái hiện ở đáy vòng (mốc 50%). */}
        <line x1="2" y1="60" x2="16" y2="60" className="stroke-foreground/40" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold tabular">
            <AnimatedNumber value={correct} format={(value) => String(Math.round(value))} />
            <span className="text-lg text-muted-foreground">/{total}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">lượt đúng</div>
        </div>
      </div>
    </div>
  )
}
