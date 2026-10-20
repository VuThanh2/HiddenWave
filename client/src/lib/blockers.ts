import type { StegoMode } from '@/api/types'
import type { SlotFile } from '@/session/useSlotFile'

/** Lý do đầu tiên khiến tác vụ chưa chạy được, hoặc null nếu đã đủ điều kiện. */
export function firstBlocker(...reasons: (string | null | false | undefined)[]): string | null {
  return reasons.find((reason): reason is string => Boolean(reason)) ?? null
}

export function slotBlocker(slot: SlotFile, label: string): string | null {
  switch (slot.probe.status) {
    case 'empty':
      return `Chọn file ${label}`
    case 'loading':
      return `Đang đọc file ${label}…`
    case 'invalid':
      return `File ${label} không hợp lệ`
    case 'ready':
      return null
  }
}

export function passphraseBlocker(mode: StegoMode, passphrase: string): string | null {
  return mode === 'hardened' && passphrase.length === 0 ? 'Nhập passphrase' : null
}
