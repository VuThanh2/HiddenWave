const keys = new WeakMap<Blob, number>()
let nextKey = 0

/** Khoá ổn định cho một đối tượng File, dùng làm React key để reset component khi file đổi. */
export function fileKey(file: Blob): number {
  let key = keys.get(file)
  if (key === undefined) {
    key = nextKey++
    keys.set(file, key)
  }
  return key
}
