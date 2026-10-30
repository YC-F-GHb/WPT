/** Keep Safari's surrounding page and safe-area background dark only while presenting. */
export const setPresentationBackground = () => {
  const root = document.documentElement
  const alreadyPresenting = root.classList.contains('wpt-presenting')
  root.classList.add('wpt-presenting')

  const updateMeta = (name: string, update: (value: string) => string) => {
    const existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    const meta = existing || document.createElement('meta')
    const original = meta.getAttribute('content')
    meta.name = name
    meta.content = update(original || '')
    if (!existing) document.head.appendChild(meta)
    return () => {
      if (!existing) meta.remove()
      else if (original === null) meta.removeAttribute('content')
      else meta.content = original
    }
  }
  const restoreTheme = updateMeta('theme-color', () => '#000000')
  const restoreViewport = updateMeta('viewport', value => {
    const settings = (value || 'width=device-width, initial-scale=1.0').split(',').filter(part => !/^\s*viewport-fit\s*=/i.test(part))
    return [...settings, 'viewport-fit=cover'].join(',')
  })

  return () => {
    if (!alreadyPresenting) root.classList.remove('wpt-presenting')
    restoreTheme()
    restoreViewport()
  }
}
