import { getFontEmbedCSS, toSvg } from 'html-to-image'
import { saveAs } from 'file-saver'

interface PDFPageImage { bytes: Uint8Array; width: number; height: number }

/** A PDF container for full-page JPEG images. Dimensions are in CSS pixels (96 dpi). */
export const createPagePDF = (pages: PDFPageImage[], width: number, height: number): Blob => {
  if (!pages.length || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('无可导出的页面')
  }
  const encode = (text: string) => new TextEncoder().encode(text)
  const chunks: Uint8Array[] = []
  const offsets = [0]
  let length = 0
  const append = (bytes: Uint8Array) => {
    chunks.push(bytes); length += bytes.length 
  }
  const object = (id: number, text: string, stream?: Uint8Array) => {
    offsets[id] = length
    append(encode(`${id} 0 obj\n${text}\n`))
    if (stream) {
      append(encode('stream\n'))
      append(stream)
      append(encode('\nendstream\n'))
    }
    append(encode('endobj\n'))
  }
  const w = Number((width * 72 / 96).toFixed(6))
  const h = Number((height * 72 / 96).toFixed(6))
  append(encode('%PDF-1.4\n'))
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`)
  pages.forEach((page, i) => {
    const id = 3 + i * 3
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Slide ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`)
    object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>`, page.bytes)
    const content = encode(`q\n${w} 0 0 ${h} 0 0 cm\n/Slide Do\nQ`)
    object(id + 2, `<< /Length ${content.length} >>`, content)
  })
  const xref = length
  append(encode(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`))
  for (const offset of offsets.slice(1)) append(encode(`${String(offset).padStart(10, '0')} 00000 n \n`))
  append(encode(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`))
  return new Blob(chunks, { type: 'application/pdf' })
}

export const exportPDF = async (container: HTMLElement, size: { width: number; height: number }, title: string) => {
  const slides = Array.from(container.querySelectorAll<HTMLElement>('.thumbnail-slide'))
  if (!slides.length) throw new Error('无可导出的页面')
  await document.fonts.ready
  await Promise.all(slides.flatMap(slide => Array.from(slide.querySelectorAll('img'), image => image.decode())))
  const fontEmbedCSS = await getFontEmbedCSS(container, { preferredFontFormat: 'woff2' })
  const pages: PDFPageImage[] = []
  // Process sequentially so large decks do not allocate all full-resolution canvases at once.
  const pixelRatio = Math.min(2, 4096 / Math.max(size.width, size.height))
  for (const slide of slides) {
    const svg = await toSvg(slide, {
      width: size.width, height: size.height, pixelRatio, quality: 1,
      backgroundColor: '#ffffff', fontEmbedCSS,
    })
    // WebKit can decode the outer SVG before its nested images have painted.
    // Keep it mounted through paint, then draw twice before serializing the canvas.
    const snapshot = new Image()
    snapshot.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;'
    snapshot.src = svg
    document.body.appendChild(snapshot)
    let data: string
    try {
      await snapshot.decode()
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(size.width * pixelRatio)
      canvas.height = Math.floor(size.height * pixelRatio)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法渲染页面')
      const draw = () => {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(snapshot, 0, 0, canvas.width, canvas.height)
      }
      draw()
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      await new Promise(resolve => setTimeout(resolve, 100))
      draw()
      data = canvas.toDataURL('image/jpeg', 1)
    }
    finally {
      snapshot.remove()
    }
    const bytes = Uint8Array.from(atob(data.split(',')[1]), char => char.charCodeAt(0))
    pages.push({ bytes, width: Math.floor(size.width * pixelRatio), height: Math.floor(size.height * pixelRatio) })
  }
  saveAs(createPagePDF(pages, size.width, size.height), `${title || '幻灯片'}.pdf`)
}
