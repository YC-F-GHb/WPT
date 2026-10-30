import type { Slide, SlideMaster, SlideLayout, PPTElement, PPTTextElement } from '@/types/slides'

export const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value))
export const findLayout = (masters: SlideMaster[], id?: string) => {
  for (const master of masters) {
    const layout = master.layouts.find(item => item.id === id)
    if (layout) return { master, layout }
  }
  return undefined
}
export const placeholderSources = (master: SlideMaster, layout?: SlideLayout): PPTElement[] => {
  const slots = new Map<string, PPTElement>()
  for (const el of [...(layout?.hideMasterPlaceholders ? [] : master.elements.filter(el => !el.placeholderKey || !layout?.suppressedPlaceholderKeys?.includes(el.placeholderKey))), ...(layout?.elements || [])]) if (el.placeholderKey) slots.set(el.placeholderKey, el)
  return [...slots.values()]
}
export const instantiatePlaceholder = (source: PPTElement, id: string): PPTElement => {
  const el = clone(source)
  el.id = id
  el.placeholderDefaults = clone(source) as unknown as Record<string, unknown>
  if (el.type === 'text') el.content = el.content.replace(/>([^<]+)</g, '><')
  return el
}
export const inheritPlaceholder = (local: PPTElement, source: PPTElement): PPTElement => {
  const base = local.placeholderDefaults
  if (!base) return local
  const result = clone(local) as unknown as Record<string, unknown>
  for (const key of new Set([...Object.keys(base), ...Object.keys(source)])) {
    const value = (source as unknown as Record<string, unknown>)[key]
    if (['id', 'content', 'placeholderDefaults'].includes(key)) continue
    if (JSON.stringify(result[key]) === JSON.stringify(base[key])) {
      if (value === undefined) delete result[key]
      else result[key] = clone(value)
    }
  }
  if (local.type === 'text' && source.type === 'text') {
    let content = local.content
    const previous = String(base.content || '')
    for (const prop of ['font-size', 'font-family', 'color']) {
      const pattern = new RegExp(`${prop}:\\s*([^;"\\s]+)`, 'i')
      const before = previous.match(pattern)?.[1]
      const after = source.content.match(pattern)?.[1]
      if (before && after && before !== after) content = content.replace(new RegExp(`${prop}:\\s*${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[;"\\s])`, 'g'), `${prop}: ${after}`)
    }
    result.content = content
  }
  result.placeholderDefaults = clone(source)
  return result as unknown as PPTElement
}
/** Presentation composition. Master decorations never become editable page objects. */
export const resolveSlide = (slide: Slide, masters: SlideMaster[]): Slide => {
  const found = findLayout(masters, slide.layoutId)
  const master = found?.master || masters.find(item => item.id === slide.masterId)
  if (!master) return slide
  const layout = found?.layout
  const inherited = slide.hideMasterGraphics ? [] : [...master.elements, ...(layout?.elements || [])]
    .filter(el => !el.placeholderKey)
    .map(el => ({ ...el, id: `${slide.id}__inherited_${el.id}` }))
  return { ...slide, background: slide.background || layout?.background || master.background,
    elements: [...inherited, ...slide.elements] }
}
export const createDefaultMaster = (id: () => string, width: number, height: number): SlideMaster => {
  const masterId = id()
  const text = (role: string, top: number, h: number, size: number): PPTTextElement => ({
    type: 'text', id: id(), placeholderKey: id(), name: role === 'title' ? '标题占位符' : '正文占位符',
    left: width * .08, top, width: width * .84, height: h, rotate: 0, defaultFontName: '', defaultColor: '#263247',
    fixedHeight: true, defaultFontSize: size, content: `<p><span style="font-size: ${size}px;">${role === 'title' ? '编辑母版标题样式' : '编辑母版正文样式'}</span></p>`,
  })
  const title = text('title', height * .09, height * .16, 36)
  const body = text('body', height * .3, height * .58, 22)
  const inherited = (source: PPTTextElement): PPTTextElement => ({ ...clone(source), id: id(), placeholderDefaults: clone(source) as unknown as Record<string, unknown> })
  const coverTitle = inherited(title); coverTitle.defaultFontSize = 48; coverTitle.top = height * .3; coverTitle.height = height * .2
  coverTitle.content = '<p><span style="font-size: 48px;">编辑母版标题样式</span></p>'
  const coverBody = inherited(body); coverBody.defaultFontSize = 24; coverBody.top = height * .55; coverBody.height = height * .18
  coverBody.content = '<p><span style="font-size: 24px;">编辑母版正文样式</span></p>'
  return { id: masterId, name: '默认母版', elements: [title, body], background: { type: 'solid', color: '#ffffff' }, layouts: [
    { id: id(), masterId, name: '标题与正文', elements: [inherited(title), inherited(body)] },
    { id: id(), masterId, name: '标题页', elements: [coverTitle, coverBody] },
    { id: id(), masterId, name: '空白', hideMasterPlaceholders: true, elements: [] },
  ] }
}
