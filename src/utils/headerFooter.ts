import type { HeaderFooterSettings, PPTTextElement, Slide } from '@/types/slides'

export const defaultHeaderFooter = (): HeaderFooterSettings => ({
  header: { enabled: false, text: '', align: 'left' },
  footer: { enabled: false, text: '', align: 'left' },
  pageNumber: { enabled: false, align: 'right', format: 'number', start: 1 },
  hideOnFirst: false, fontSize: 14, color: '#687386', margin: 24,
})
export const normalizeHeaderFooter = (value: Partial<HeaderFooterSettings> = {}): HeaderFooterSettings => {
  const defaults = defaultHeaderFooter()
  const align = (v: unknown, fallback: 'left' | 'center' | 'right') => ['left','center','right'].includes(String(v)) ? v as typeof fallback : fallback
  const bounded = (v: unknown, min: number, max: number, fallback: number) => Number.isFinite(Number(v)) ? Math.min(max,Math.max(min,Number(v))) : fallback
  return {
    header: { enabled: !!value.header?.enabled, text: String(value.header?.text || '').slice(0,500), align: align(value.header?.align,'left') },
    footer: { enabled: !!value.footer?.enabled, text: String(value.footer?.text || '').slice(0,500), align: align(value.footer?.align,'left') },
    pageNumber: { enabled: !!value.pageNumber?.enabled, align: align(value.pageNumber?.align,'right'), format: value.pageNumber?.format === 'total' ? 'total' : 'number', start: Math.round(bounded(value.pageNumber?.start,0,99999,1)) },
    hideOnFirst: !!value.hideOnFirst, fontSize: bounded(value.fontSize,8,48,defaults.fontSize),
    color: /^#[0-9a-f]{6}$/i.test(value.color || '') ? value.color! : defaults.color,
    margin: bounded(value.margin,8,100,defaults.margin),
  }
}
const escape = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
export const headerFooterElements = (slide: Slide, config: HeaderFooterSettings, index: number, count: number, width: number, height: number): PPTTextElement[] => {
  const settings = normalizeHeaderFooter(slide.headerFooter || config)
  if (index < 0 || (index === 0 && settings.hideOnFirst)) return []
  const { fontSize, margin, color } = settings
  const lineHeight = fontSize * 1.8
  const text = (key: string, value: string, align: 'left' | 'center' | 'right', top: number): PPTTextElement => ({
    id: `${slide.id}__running_${key}`, type: 'text', name: key, left: margin, top,
    width: Math.max(1,width - margin * 2), height: lineHeight, rotate: 0, lock: true,
    defaultFontName: '', defaultFontSize: fontSize, defaultColor: color, fixedHeight: true,
    inset: [0,0,0,0], vAlign: 'middle',
    content: `<p style="text-align: ${align};"><span style="font-size: ${fontSize}px;">${escape(value)}</span></p>`,
  })
  const elements: PPTTextElement[] = []
  if (settings.header.enabled && settings.header.text) elements.push(text('header',settings.header.text,settings.header.align,margin))
  const bottom = height - margin - lineHeight
  if (settings.footer.enabled && settings.footer.text) {
    const sharedAlignment = settings.pageNumber.enabled && settings.pageNumber.align === settings.footer.align
    elements.push(text('footer',settings.footer.text,settings.footer.align,sharedAlignment ? bottom-lineHeight-4 : bottom))
  }
  if (settings.pageNumber.enabled) {
    const number = index + settings.pageNumber.start
    const label = settings.pageNumber.format === 'total' ? `${number} / ${count + settings.pageNumber.start - 1}` : String(number)
    elements.push(text('page-number',label,settings.pageNumber.align,bottom))
  }
  return elements
}
