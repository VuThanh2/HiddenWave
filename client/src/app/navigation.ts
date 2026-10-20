import { useSyncExternalStore } from 'react'

import { DEFAULT_ROUTE, findRoute, type RouteId } from './routes'

// Hash routing: FastAPI phục vụ bản build bằng StaticFiles, vốn trả 404 khi tải lại một đường dẫn
// sâu như /compare. Với #/compare, server luôn chỉ thấy "/".
function readRoute(): RouteId {
  const id = window.location.hash.replace(/^#\/?/, '')
  return findRoute(id)?.id ?? DEFAULT_ROUTE
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): RouteId {
  return useSyncExternalStore(subscribe, readRoute)
}

export function navigate(route: RouteId): void {
  window.location.hash = `/${route}`
}

export function routeHref(route: RouteId): string {
  return `#/${route}`
}
