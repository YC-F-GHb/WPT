import { pxToMm } from './units'
interface PageSize {
  width: number
  height: number
  margin: number
}

let removePreviousFrame: (() => void) | undefined

export const print = async (printNode: HTMLElement, size: PageSize) => {
  removePreviousFrame?.()
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', '打印幻灯片')
  iframe.style.cssText = `position:fixed;left:-100000px;top:0;width:${size.width}px;height:${size.height}px;border:0;`
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const frame = iframe.contentWindow
  const cleanup = () => {
    frame?.removeEventListener('afterprint', cleanup)
    iframe.remove()
    if (removePreviousFrame === cleanup) removePreviousFrame = undefined
  }
  removePreviousFrame = cleanup
  if (!doc || !frame) {
    cleanup()
    throw new Error('无法创建打印页面')
  }

  try {
    let style = ''
    const externalStyles: string[] = []
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) style += rule.cssText
      }
      catch {
        // Cross-origin stylesheets cannot expose cssRules; load the original URL instead.
        if (sheet.href) externalStyles.push(sheet.href)
      }
    }
    const { width, height, margin } = size
    // Listen BEFORE doc.close(): cached resources can finish loading immediately.
    const loaded = new Promise<void>(resolve => iframe.addEventListener('load', () => resolve(), { once: true }))
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><style>
      ${style}
      html, body { height:auto; overflow:visible; background:white; margin:0; }
      body { width:${width}px; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      @page { size:${pxToMm(width + 2 * margin)}mm ${pxToMm(height + 2 * margin)}mm; margin:${pxToMm(margin)}mm; }
    </style></head><body>${printNode.innerHTML}</body></html>`)
    const base = doc.createElement('base')
    base.href = document.baseURI
    doc.head.prepend(base)
    for (const href of externalStyles) {
      const link = doc.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      doc.head.appendChild(link)
    }
    doc.close()
    // readyState also covers browsers that dispatch the document load synchronously.
    if (doc.readyState !== 'complete') await loaded
    await doc.fonts?.ready
    await Promise.all(Array.from(doc.images, image => image.decode?.().catch(() => {})))
    frame.addEventListener('afterprint', cleanup)
    frame.focus()
    frame.print()
  }
  catch (error) {
    cleanup()
    throw error
  }
}
