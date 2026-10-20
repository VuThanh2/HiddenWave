import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError, isAbortError } from '@/api/client'
import { toApiError } from '@/api/errorCopy'

export type RequestState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: ApiError }

type Task<A extends unknown[], T> = (signal: AbortSignal, ...args: A) => Promise<T>

/** Một request tại một thời điểm: gọi `run` lần nữa sẽ huỷ request cũ. */
export function useRequest<A extends unknown[], T>(task: Task<A, T>) {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)
  const taskRef = useRef(task)

  useEffect(() => {
    taskRef.current = task
  })

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const run = useCallback(
    async (...args: A): Promise<T | undefined> => {
      cancel()
      const controller = new AbortController()
      controllerRef.current = controller
      setState((previous) => ({ status: 'loading', data: previous.data }))
      try {
        const data = await taskRef.current(controller.signal, ...args)
        if (!controller.signal.aborted) setState({ status: 'success', data })
        return data
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return undefined
        setState({ status: 'error', error: toApiError(error) })
        return undefined
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [cancel],
  )

  const reset = useCallback(() => {
    cancel()
    setState({ status: 'idle' })
  }, [cancel])

  const abort = useCallback(() => {
    cancel()
    setState((previous) => (previous.status === 'loading' ? { status: 'idle' } : previous))
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { ...state, isLoading: state.status === 'loading', run, reset, abort }
}
