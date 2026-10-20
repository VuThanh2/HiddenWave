import { useEffect } from 'react'

import { objectUrlFor, retainObjectUrl } from '@/lib/objectUrls'

export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  useEffect(() => (blob ? retainObjectUrl(blob) : undefined), [blob])
  return blob ? objectUrlFor(blob) : undefined
}
