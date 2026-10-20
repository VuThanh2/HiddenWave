import { ArrowRight, AudioLines, CheckCircle2, Download, FileSearch, Info } from 'lucide-react'
import { motion } from 'motion/react'

import type { EncodeResult, StegoMode } from '@/api/types'
import { navigate } from '@/app/navigation'
import { ModeBadge } from '@/components/ModeBadge'
import { StatTile } from '@/components/StatTile'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/lib/download'
import { formatBytes, formatInt, formatPercent } from '@/lib/format'

interface Props {
  result: EncodeResult
  mode: StegoMode
  totalSamples: number
  stale: boolean
}

export function EncodeResultCard({ result, mode, totalSamples, stale }: Props) {
  const { stego, stats } = result

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3">
        <motion.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.6, delay: 0.05 }}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-success/15 text-success"
        >
          <CheckCircle2 className="size-5" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Đã tạo file stego</span>
            <ModeBadge mode={mode} />
          </div>
          <div className="truncate text-sm text-muted-foreground" title={stego.name}>
            {stego.name} · {formatBytes(stego.size)}
          </div>
        </div>
      </div>

      {stale && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">
          <Info className="size-3.5 shrink-0 text-warning" />
          Bạn đã thay đổi thông tin — bấm Encode lại để cập nhật.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Message"
          value={`${formatInt(stats.payloadBytes)} byte`}
          sub={`dùng ${formatPercent(stats.payloadBytes / stats.capacityBytes)} dung lượng`}
        />
        <StatTile
          label="Mẫu âm thanh bị đổi"
          value={formatInt(stats.changedSamples)}
          sub={`${formatPercent(stats.changedSamples / totalSamples, 3)} toàn bộ file`}
        />
      </div>

      <div className="space-y-2">
        <Button className="h-10 w-full" onClick={() => downloadFile(stego)}>
          <Download />
          Tải file stego
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-9" onClick={() => navigate('compare')}>
            <AudioLines />
            So sánh
            <ArrowRight className="ml-auto opacity-60" />
          </Button>
          <Button variant="outline" className="h-9" onClick={() => navigate('decode')}>
            <FileSearch />
            Decode thử
            <ArrowRight className="ml-auto opacity-60" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Các màn hình khác sẽ tự dùng file này.
        </p>
      </div>
    </motion.div>
  )
}
