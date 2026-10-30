const fontKeys = new Set(['fontName', 'fontname', 'defaultFontName', 'fontFamily'])
const normalize = (font: string) => font.trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase()
const families = (font: string) => font.match(/"[^"]*"|'[^']*'|[^,]+/g) || []

// Only font fields and inline font-family declarations are changed.
export const processDocumentFonts = <T>(documentData: T, replacement?: {from: string; to: string}) => {
  const fonts = new Set<string>()
  let count = 0
  const family = (value: string) => {
    if (!value.trim()) {
      fonts.add('')
      if (replacement && replacement.from === '') { count++; return replacement.to }
      return value
    }
    return families(value).map(token => {
      const name=token.trim().replace(/^['"]|['"]$/g,'')
      fonts.add(name)
      if (replacement && normalize(name) === normalize(replacement.from)) { count++; return `"${replacement.to.replace(/["\\]/g,'\\$&')}"` }
      return token.trim()
    }).join(', ')
  }
  const walk = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (fontKeys.has(key)) {
        // Plain font names are stored without CSS quotes.
        const result=family(value)
        return replacement && normalize(value) === normalize(replacement.from) ? replacement.to : replacement ? result : value
      }
      if (!/font-family\s*:/i.test(value) || !['content','remark'].includes(key)) return value
      const template=document.createElement('template')
      template.innerHTML=value
      let changed=false
      template.content.querySelectorAll<HTMLElement>('[style]').forEach(el => {
        const current=el.style.fontFamily
        if (!current) return
        const before=count
        const next=family(current)
        if (replacement && count !== before) { el.style.fontFamily=next; changed=true }
      })
      return changed ? template.innerHTML : value
    }
    if (Array.isArray(value)) return value.map(item=>walk(item))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,k)]))
    return value
  }
  const data=walk(documentData) as T
  return {data,fonts:[...fonts].sort((a,b)=>a.localeCompare(b)),count}
}
