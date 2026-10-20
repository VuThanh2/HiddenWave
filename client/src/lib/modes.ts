import { LockOpen, ShieldCheck, type LucideIcon } from 'lucide-react'

import type { StegoMode } from '@/api/types'

interface ModeMeta {
  label: string
  summary: string
  icon: LucideIcon
}

export const MODE_META: Record<StegoMode, ModeMeta> = {
  classic: {
    label: 'Classic',
    summary: 'Nhanh, không cần passphrase',
    icon: LockOpen,
  },
  hardened: {
    label: 'Hardened',
    summary: 'Mã hoá bằng passphrase, khó bị phát hiện hơn',
    icon: ShieldCheck,
  },
}
