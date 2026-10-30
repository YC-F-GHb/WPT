import { stopActiveDrag } from './drag'

export const MIN_CANVAS_PERCENTAGE = 30
export const MAX_CANVAS_PERCENTAGE = 200
export const clampCanvasPercentage = (value: number, min = MIN_CANVAS_PERCENTAGE, max = MAX_CANVAS_PERCENTAGE) => Math.min(max, Math.max(min, value))

interface ViewportState { percentage: number; scale: number; left: number; top: number }

/** Capture two-finger gestures before element selection and keep the slide point under the fingers fixed. */
export const bindCanvasPinch = (surface: HTMLElement, getState: () => ViewportState, setState: (state: ViewportState) => void) => {
  let active = false
  let fingers: number[] = []
  let startDistance = 0
  let origin: ViewportState
  let anchor = { x: 0, y: 0 }
  const suppress = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }
  const start = (event: TouchEvent) => {
    if (event.touches.length < 2) {
      if (active) suppress(event)
      return
    }
    stopActiveDrag()
    suppress(event)
    if (active) return
    active = true
    const [a, b] = Array.from(event.touches)
    fingers = [a.identifier, b.identifier]
    startDistance = Math.max(1, Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY))
    origin = getState()
    const rect = surface.getBoundingClientRect()
    anchor = {
      x: ((a.clientX + b.clientX) / 2 - rect.left - origin.left) / origin.scale,
      y: ((a.clientY + b.clientY) / 2 - rect.top - origin.top) / origin.scale,
    }
  }
  const move = (event: TouchEvent) => {
    if (!active) return
    suppress(event)
    const touches = fingers.map(id => Array.from(event.touches).find(touch => touch.identifier === id))
    const [a, b] = touches
    if (!a || !b) return
    const ratio = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) / startDistance
    // Explicit zoom presets may already lie outside the fit-relative button range.
    // Preserve that starting zoom instead of jumping when a second finger lands.
    const percentage = clampCanvasPercentage(origin.percentage * ratio, Math.min(MIN_CANVAS_PERCENTAGE, origin.percentage), Math.max(MAX_CANVAS_PERCENTAGE, origin.percentage))
    const scale = origin.scale * percentage / origin.percentage
    const rect = surface.getBoundingClientRect()
    setState({
      percentage, scale,
      left: (a.clientX + b.clientX) / 2 - rect.left - anchor.x * scale,
      top: (a.clientY + b.clientY) / 2 - rect.top - anchor.y * scale,
    })
  }
  const end = (event: TouchEvent) => {
    if (!active) return
    suppress(event)
    // Do not resume moving an element with the remaining finger after a pinch.
    if (!event.touches.length) active = false
  }
  const reset = () => {
    active = false 
  }
  surface.addEventListener('touchstart', start, { capture: true, passive: false })
  surface.addEventListener('touchmove', move, { capture: true, passive: false })
  surface.addEventListener('touchend', end, { capture: true, passive: false })
  surface.addEventListener('touchcancel', end, { capture: true, passive: false })
  window.addEventListener('blur', reset)
  return () => {
    surface.removeEventListener('touchstart', start, true)
    surface.removeEventListener('touchmove', move, true)
    surface.removeEventListener('touchend', end, true)
    surface.removeEventListener('touchcancel', end, true)
    window.removeEventListener('blur', reset)
    stopActiveDrag()
  }
}
