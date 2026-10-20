import type {
  CapacityResponse,
  ChiSquareResponse,
  CompareResponse,
  DecodeResponse,
  EncodeResult,
  ErrorResponse,
  HealthResponse,
  RobustnessResponse,
  RsResponse,
  StegoMode,
  SweepResponse,
} from './types'

const API_BASE = '/api'

export const NETWORK_ERROR = 'network_error'
const UNKNOWN_ERROR = 'unknown_error'

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(API_BASE + path, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(NETWORK_ERROR, 'Cannot reach the HiddenWave engine', 0)
  }
  if (!response.ok) throw await toApiError(response)
  return response
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ErrorResponse>
    if (body.code && body.message) return new ApiError(body.code, body.message, response.status)
  } catch {
    // Body không phải JSON (vd proxy trả HTML khi engine tắt): rơi xuống lỗi chung bên dưới.
  }
  const code = response.status >= 500 ? NETWORK_ERROR : UNKNOWN_ERROR
  return new ApiError(code, `${response.status} ${response.statusText}`, response.status)
}

async function postForm<T>(path: string, fields: FormFields, signal?: AbortSignal): Promise<T> {
  const response = await send(path, { method: 'POST', body: toFormData(fields), signal })
  return (await response.json()) as T
}

type FormValue = string | number | boolean | Blob | undefined
type FormFields = Record<string, FormValue | FormValue[]>

function toFormData(fields: FormFields): FormData {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined) continue
      if (item instanceof File) form.append(name, item, item.name)
      else if (item instanceof Blob) form.append(name, item)
      else form.append(name, String(item))
    }
  }
  return form
}

function headerInt(headers: Headers, name: string): number {
  return Number.parseInt(headers.get(name) ?? '0', 10)
}

function attachmentFilename(headers: Headers, fallback: string): string {
  const disposition = headers.get('Content-Disposition') ?? ''
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = /filename="([^"]+)"/i.exec(disposition)
  return plain ? plain[1] : fallback
}

interface ModeFields {
  mode: StegoMode
  passphrase?: string
}

function modeFields({ mode, passphrase }: ModeFields) {
  return { mode, passphrase: mode === 'hardened' ? passphrase : undefined }
}

export const api = {
  async health(signal?: AbortSignal): Promise<HealthResponse> {
    const response = await send('/health', { signal })
    return (await response.json()) as HealthResponse
  },

  capacity(cover: File, signal?: AbortSignal) {
    return postForm<CapacityResponse>('/capacity', { cover }, signal)
  },

  async encode(
    request: ModeFields & { cover: File; message: string },
    signal?: AbortSignal,
  ): Promise<EncodeResult> {
    const fields = { cover: request.cover, message: request.message, ...modeFields(request) }
    const response = await send('/encode', { method: 'POST', body: toFormData(fields), signal })
    const { headers } = response
    const filename = attachmentFilename(headers, 'cover.stego.wav')
    return {
      stego: new File([await response.blob()], filename, { type: 'audio/wav' }),
      stats: {
        payloadBytes: headerInt(headers, 'X-Payload-Bytes'),
        capacityBytes: headerInt(headers, 'X-Capacity-Bytes'),
        embeddedBits: headerInt(headers, 'X-Embedded-Bits'),
        changedSamples: headerInt(headers, 'X-Changed-Samples'),
      },
    }
  },

  decode(request: ModeFields & { stego: File }, signal?: AbortSignal) {
    return postForm<DecodeResponse>(
      '/decode',
      { stego: request.stego, ...modeFields(request) },
      signal,
    )
  },

  compare(cover: File, stego: File, signal?: AbortSignal) {
    return postForm<CompareResponse>('/analyze/compare', { cover, stego }, signal)
  },

  chiSquare(request: { file: File; windowSize?: number; step?: number }, signal?: AbortSignal) {
    return postForm<ChiSquareResponse>(
      '/analyze/chi-square',
      { file: request.file, window_size: request.windowSize, step: request.step },
      signal,
    )
  },

  rs(file: File, signal?: AbortSignal) {
    return postForm<RsResponse>('/analyze/rs', { file }, signal)
  },

  sweep(
    request: { cover: File; rates: number[]; includeRs: boolean; windowSize?: number },
    signal?: AbortSignal,
  ) {
    return postForm<SweepResponse>(
      '/analyze/sweep',
      {
        cover: request.cover,
        rates: request.rates,
        include_rs: request.includeRs,
        window_size: request.windowSize,
      },
      signal,
    )
  },

  mp3RoundTrip(request: ModeFields & { stego: File }, signal?: AbortSignal) {
    return postForm<RobustnessResponse>(
      '/robustness/mp3',
      { stego: request.stego, ...modeFields(request) },
      signal,
    )
  },
}
