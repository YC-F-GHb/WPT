import type { Slide } from '@/types/slides'

const tags = new Set(['p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sup', 'sub', 'code', 'blockquote', 'ul', 'ol', 'li', 'br', 'mark', 'a'])
const styles = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'text-indent', 'line-height', 'letter-spacing', 'margin-left', 'margin-top', 'margin-bottom', 'vertical-align', 'white-space'])

/** Reconstruct inert HTML from an explicit formatting allowlist. Never keep resources or event attributes. */
export const sanitizeHTML = (input: string): string => {
  const source = document.createElement('template')
  source.innerHTML = String(input || '')
  const target = document.createElement('div')
  const visit = (node: Node, parent: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.textContent || '')); return }
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName.toLowerCase()
    if (['script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math'].includes(tag)) return
    if (!tags.has(tag)) { for (const child of Array.from(node.childNodes)) visit(child, parent); return }
    const clean = document.createElement(tag)
    for (const property of Array.from(node.style)) {
      const value = node.style.getPropertyValue(property)
      if (styles.has(property) && !/url\s*\(|expression|@import|[<>\\]/i.test(value)) clean.style.setProperty(property, value)
    }
    for (const attribute of ['data-indent', 'start']) {
      const value = node.getAttribute(attribute)
      if (value && /^\d{1,3}$/.test(value)) clean.setAttribute(attribute, value)
    }
    // External hyperlinks and remote resource loading are intentionally unsupported.
    for (const child of Array.from(node.childNodes)) visit(child, clean)
    parent.appendChild(clean)
  }
  for (const child of Array.from(source.content.childNodes)) visit(child, target)
  return target.innerHTML
}

export const isLocalImage = (value: string) => /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)

/** Apply at every store write, including file import, paste and cross-window messages. */
export const sanitizeData = <T>(input: T): T => {
  const walk = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (['content', 'remark'].includes(key)) return sanitizeHTML(value)
      if (['src', 'pattern', 'poster'].includes(key)) return isLocalImage(value) ? value : ''
      return value
    }
    if (Array.isArray(value)) return value.filter(item => !(item && typeof item === 'object' && ['audio', 'video'].includes(item.type))).map(item => walk(item))
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [name, item] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype', 'link'].includes(name)) continue
        result[name] = walk(item, name)
      }
      return result
    }
    return value
  }
  return walk(input) as T
}
export const sanitizeSlides = (slides: Slide[]) => {
  if (!Array.isArray(slides)) throw new Error('文稿页面数据格式无效')
  return sanitizeData(slides)
}
export const escapeHTML = (text: string) => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
