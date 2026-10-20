import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'

import { Button } from '@/components/ui/button'
import { DecodePage } from '@/features/decode/DecodePage'
import { EncodePage } from '@/features/encode/EncodePage'
import { useHealth } from '@/hooks/useHealth'
import { cn } from '@/lib/utils'

import { BackendOffline } from './BackendOffline'
import { HealthContext } from './health-context'
import { Logo } from './Logo'
import { useRoute } from './navigation'
import { PageActivityContext } from './page-activity'
import { findRoute, type RouteId } from './routes'
import { SidebarContent } from './SidebarContent'

// Plotly và wavesurfer chiếm phần lớn bundle: chỉ tải khi mở màn hình Đánh giá lần đầu.
const ComparePage = lazy(() =>
  import('@/features/compare/ComparePage').then((module) => ({ default: module.ComparePage })),
)
const AnalyzePage = lazy(() =>
  import('@/features/analyze/AnalyzePage').then((module) => ({ default: module.AnalyzePage })),
)
const RobustnessPage = lazy(() =>
  import('@/features/robustness/RobustnessPage').then((module) => ({
    default: module.RobustnessPage,
  })),
)
const ListeningTestPage = lazy(() =>
  import('@/features/listening-test/ListeningTestPage').then((module) => ({
    default: module.ListeningTestPage,
  })),
)

const PAGES: Record<RouteId, ComponentType> = {
  encode: EncodePage,
  decode: DecodePage,
  compare: ComparePage,
  analyze: AnalyzePage,
  robustness: RobustnessPage,
  'listening-test': ListeningTestPage,
}

export function AppShell() {
  const route = useRoute()
  const health = useHealth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [visited, setVisited] = useState<RouteId[]>([route])
  if (!visited.includes(route)) setVisited([...visited, route])

  useEffect(() => {
    document.title = `${findRoute(route)?.label ?? ''} · HiddenWave`
    window.scrollTo({ top: 0 })
  }, [route])

  return (
    <HealthContext.Provider value={health.status === 'online' ? health.health : null}>
      <div className="min-h-svh bg-signal-grid">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r bg-sidebar/85 backdrop-blur-xl lg:block">
          <SidebarContent route={route} health={health} />
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl lg:hidden">
          <span className="flex items-center gap-2 font-semibold">
            <Logo className="size-7" />
            HiddenWave
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </Button>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                key="drawer"
                className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r bg-sidebar shadow-2xl lg:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-4 right-3"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Đóng menu"
                >
                  <X />
                </Button>
                <SidebarContent
                  route={route}
                  health={health}
                  onNavigate={() => setMenuOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="lg:pl-68">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {visited.map((id) => {
              const Page = PAGES[id]
              const active = id === route
              return (
                <PageActivityContext.Provider key={id} value={active}>
                  {/* display:none → block khởi động lại animation CSS mỗi lần quay lại màn hình. */}
                  <div
                    hidden={!active}
                    className={cn(
                      active && 'animate-in duration-300 fade-in-0 slide-in-from-bottom-2',
                    )}
                  >
                    <Suspense fallback={<PageSkeleton />}>
                      <Page />
                    </Suspense>
                  </div>
                </PageActivityContext.Provider>
              )
            })}
          </div>
        </main>

        <AnimatePresence>
          {health.status === 'offline' && <BackendOffline onRetry={health.retry} />}
        </AnimatePresence>
      </div>
    </HealthContext.Provider>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
    </div>
  )
}
