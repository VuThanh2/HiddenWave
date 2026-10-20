import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import type { HealthState } from '@/hooks/useHealth'

import { HealthBadge } from './HealthBadge'
import { Logo } from './Logo'
import { routeHref } from './navigation'
import { ROUTE_GROUPS, type RouteId } from './routes'
import { SessionDock } from './SessionDock'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  route: RouteId
  health: HealthState
  onNavigate?: () => void
}

export function SidebarContent({ route, health, onNavigate }: Props) {
  const ffmpegMissing = health.status === 'online' && !health.health.ffmpeg_available

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <a href={routeHref('encode')} onClick={onNavigate} className="flex items-center gap-2.5 px-1">
        <Logo />
        <span className="leading-tight">
          <span className="block font-semibold tracking-tight">HiddenWave</span>
          <span className="block text-[11px] text-muted-foreground">LSB audio steganography</span>
        </span>
      </a>

      <nav className="space-y-5" aria-label="Điều hướng chính">
        {ROUTE_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {group.label}
            </div>
            {group.routes.map((item) => {
              const active = item.id === route
              const dimmed = item.id === 'robustness' && ffmpegMissing
              const Icon = item.icon
              return (
                <a
                  key={item.id}
                  href={routeHref(item.id)}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={dimmed ? 'Máy này chưa có FFmpeg' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    active
                      ? 'text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    dimmed && 'opacity-45',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-sidebar-accent ring-1 ring-sidebar-border"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <Icon className={cn('relative size-4 shrink-0', active && 'text-primary')} />
                  <span className="relative min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <SessionDock />
        <HealthBadge health={health} />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Giao diện</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
