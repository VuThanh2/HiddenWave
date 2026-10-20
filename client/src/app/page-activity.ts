import { createContext, useContext } from 'react'

// Các màn hình đã mở được giữ lại khi chuyển trang (không mất kết quả sweep, message đang gõ...);
// context này báo màn hình nào đang hiện để dừng audio của màn hình bị ẩn.
export const PageActivityContext = createContext(true)

export function usePageActive(): boolean {
  return useContext(PageActivityContext)
}
