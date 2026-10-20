import { AppShell } from '@/app/AppShell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/session/SessionProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
