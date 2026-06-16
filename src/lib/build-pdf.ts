// Minimal single-page PDF builder — no external dependencies.
// Embeds a JPEG image occupying the entire page.
export function buildSinglePageImagePDF(
  jpegDataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
): Uint8Array {
  // Decode base64 JPEG
  const b64 = jpegDataUrl.split(',')[1]
  const raw = atob(b64)
  const jpeg = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) jpeg[i] = raw.charCodeAt(i)

  const W = canvasWidth
  const H = canvasHeight
  const enc = new TextEncoder()
  const s = (str: string) => enc.encode(str)

  const streamData = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`
  const obj1  = s('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n')
  const obj2  = s('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n')
  const obj3  = s(`3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}]\n/Contents 4 0 R /Resources <</XObject <</Im0 5 0 R>>>>>>\nendobj\n`)
  const obj4  = s(`4 0 obj\n<</Length ${streamData.length}>>\nstream\n${streamData}\nendstream\nendobj\n`)
  const obj5h = s(`5 0 obj\n<</Type /XObject /Subtype /Image /Width ${W} /Height ${H}\n/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length}>>\nstream\n`)
  const obj5f = s('\nendstream\nendobj\n')
  const hdr   = s('%PDF-1.4\n')

  const off1    = hdr.length
  const off2    = off1 + obj1.length
  const off3    = off2 + obj2.length
  const off4    = off3 + obj3.length
  const off5    = off4 + obj4.length
  const xrefOff = off5 + obj5h.length + jpeg.length + obj5f.length

  const pad = (n: number) => n.toString().padStart(10, '0')
  const xref = s(
    'xref\n0 6\n0000000000 65535 f \n' +
    `${pad(off1)} 00000 n \n` +
    `${pad(off2)} 00000 n \n` +
    `${pad(off3)} 00000 n \n` +
    `${pad(off4)} 00000 n \n` +
    `${pad(off5)} 00000 n \n` +
    `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefOff}\n%%EOF\n`
  )

  const parts = [hdr, obj1, obj2, obj3, obj4, obj5h, jpeg, obj5f, xref]
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  return out
}
