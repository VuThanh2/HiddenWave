import { api } from './client'
import type { CapacityResponse } from './types'

// /api/capacity vừa kiểm tra file hợp lệ vừa trả thông tin audio, nên mọi ô nạp file dùng nó để
// báo lỗi sớm. Cache theo đối tượng File để chuyển màn hình không gọi lại.
const probes = new WeakMap<File, Promise<CapacityResponse>>()

export function probeWav(file: File): Promise<CapacityResponse> {
  let probe = probes.get(file)
  if (!probe) {
    probe = api.capacity(file)
    probes.set(file, probe)
    probe.catch(() => probes.delete(file))
  }
  return probe
}
