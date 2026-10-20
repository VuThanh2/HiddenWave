import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="hw-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--cover)" />
          <stop offset="1" stopColor="var(--stego)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#hw-logo)" />
      <path
        d="M6 16h3l2-6 3 12 3-9 2 5 2-2h5"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
