import { createContext, useContext } from 'react'

import type { HealthResponse } from '@/api/types'

export const HealthContext = createContext<HealthResponse | null>(null)

export function useEngineHealth(): HealthResponse | null {
  return useContext(HealthContext)
}
