import { ApiError } from './client'

export interface ErrorCopy {
  title: string
  hint?: string
  /** Hiện thêm lý do gốc từ engine khi nó cụ thể hơn tiêu đề (vd file WAV hỏng ở đâu). */
  showDetail?: boolean
}

const COPY: Record<string, ErrorCopy> = {
  invalid_wav: {
    title: 'File không hợp lệ',
    hint: 'Chỉ hỗ trợ file WAV 16-bit, mono hoặc stereo.',
    showDetail: true,
  },
  incompatible_audio: {
    title: 'Hai file không khớp nhau',
    hint: 'Cover và stego phải có cùng định dạng và cùng độ dài.',
    showDetail: true,
  },
  upload_too_large: { title: 'File quá lớn', showDetail: true },
  invalid_input: { title: 'Thông tin nhập chưa hợp lệ', showDetail: true },
  capacity_exceeded: {
    title: 'Message quá dài',
    hint: 'Hãy rút ngắn message hoặc dùng file cover dài hơn.',
  },
  message_not_found: {
    title: 'Không tìm thấy message',
    hint: 'File có thể không chứa message, hoặc đã được giấu bằng chế độ Hardened.',
  },
  authentication_failed: {
    title: 'Không giải mã được',
    hint: 'Sai passphrase, file đã bị chỉnh sửa, hoặc file không chứa message.',
  },
  transcoder_unavailable: {
    title: 'Máy này chưa có FFmpeg',
    hint: 'Cài FFmpeg rồi khởi động lại engine để dùng tính năng này.',
  },
  transcoding_failed: { title: 'Chuyển đổi MP3 thất bại', showDetail: true },
  network_error: {
    title: 'Không kết nối được engine',
    hint: 'Kiểm tra engine còn đang chạy.',
  },
}

const FALLBACK: ErrorCopy = { title: 'Đã xảy ra lỗi', showDetail: true }

export function errorCopy(code: string): ErrorCopy {
  return COPY[code] ?? FALLBACK
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new ApiError('unknown_error', message, 0)
}
