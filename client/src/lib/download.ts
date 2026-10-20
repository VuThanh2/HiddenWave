export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  // Trì hoãn để trình duyệt kịp bắt đầu tải trước khi URL bị thu hồi.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
