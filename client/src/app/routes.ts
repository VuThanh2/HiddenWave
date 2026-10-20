import {
  ActivitySquare,
  AudioLines,
  Ear,
  FileLock2,
  FileSearch,
  ShieldHalf,
  type LucideIcon,
} from 'lucide-react'

export type RouteId = 'encode' | 'decode' | 'compare' | 'analyze' | 'robustness' | 'listening-test'

export interface RouteDef {
  id: RouteId
  label: string
  description: string
  icon: LucideIcon
}

export interface RouteGroup {
  label: string
  routes: RouteDef[]
}

// Thứ tự bám kịch bản demo: Encode → Compare → Decode → Robustness.
export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: 'Sử dụng',
    routes: [
      {
        id: 'encode',
        label: 'Encode',
        description: 'Giấu tin vào file âm thanh',
        icon: FileLock2,
      },
      {
        id: 'decode',
        label: 'Decode',
        description: 'Lấy tin đã giấu ra',
        icon: FileSearch,
      },
    ],
  },
  {
    label: 'Đánh giá',
    routes: [
      {
        id: 'compare',
        label: 'Compare',
        description: 'Nghe và so sánh hai file',
        icon: AudioLines,
      },
      {
        id: 'analyze',
        label: 'Analyze',
        description: 'Thử phát hiện tin giấu',
        icon: ActivitySquare,
      },
      {
        id: 'robustness',
        label: 'Robustness',
        description: 'Tin còn không sau khi nén MP3',
        icon: ShieldHalf,
      },
      {
        id: 'listening-test',
        label: 'Listening Test',
        description: 'Thử nghe phân biệt',
        icon: Ear,
      },
    ],
  },
]

export const ROUTES: RouteDef[] = ROUTE_GROUPS.flatMap((group) => group.routes)
export const DEFAULT_ROUTE: RouteId = 'encode'

export function findRoute(id: string): RouteDef | undefined {
  return ROUTES.find((route) => route.id === id)
}
