const encoder = new TextEncoder()

// multipart/form-data chuẩn hoá mọi xuống dòng thành CRLF trước khi gửi, nên engine nhận (và đếm)
// message theo dạng này. Đếm trên cùng dạng để capacity meter khớp đúng số byte được nhúng.
export function toWireText(message: string): string {
  return message.replace(/\r\n|\r|\n/g, '\r\n')
}

export function messageByteLength(message: string): number {
  return encoder.encode(toWireText(message)).length
}
