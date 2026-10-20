import { cn } from '@/lib/utils'
import type { HealthState } from '@/hooks/useHealth'

export function HealthBadge({ health }: { health: HealthState }) {
  const online = health.status === 'online'
  const ffmpeg = online && health.health.ffmpeg_available

  return (
    <div className="space-y-1.5 rounded-lg border bg-card/50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <span className="relative flex size-2">
            {online && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
            )}
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                online
                  ? 'bg-success'
                  : health.status === 'checking'
                    ? 'bg-muted-foreground'
                    : 'bg-destructive',
              )}
            />
          </span>
          Engine
        </span>
        <span className="text-muted-foreground tabular">
          {online ? `v${health.health.version}` : health.status === 'checking' ? '…' : 'offline'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>FFmpeg</span>
        <span className={cn(ffmpeg ? 'text-success' : 'text-muted-foreground')}>
          {online ? (ffmpeg ? 'sẵn sàng' : 'chưa có') : '—'}
        </span>
      </div>
    </div>
  )
}
