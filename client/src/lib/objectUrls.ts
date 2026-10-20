interface Entry {
  url: string
  users: number
}

const entries = new Map<Blob, Entry>()

export function objectUrlFor(blob: Blob): string {
  let entry = entries.get(blob)
  if (!entry) {
    entry = { url: URL.createObjectURL(blob), users: 0 }
    entries.set(blob, entry)
  }
  return entry.url
}

/** Giữ URL sống khi còn component dùng; trả về hàm nhả. */
export function retainObjectUrl(blob: Blob): () => void {
  objectUrlFor(blob)
  const entry = entries.get(blob)!
  entry.users++
  return () => {
    entry.users--
    // Hoãn một nhịp: StrictMode unmount rồi mount lại ngay, không được thu hồi URL giữa chừng.
    setTimeout(() => {
      if (entry.users > 0 || entries.get(blob) !== entry) return
      URL.revokeObjectURL(entry.url)
      entries.delete(blob)
    })
  }
}
