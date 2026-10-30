export type DragInput = MouseEvent | TouchEvent
export interface DragPoint { pageX: number; pageY: number }

export const getDragPoint = (event: DragInput): DragPoint | null => {
  if ('touches' in event) return event.touches.length === 1 ? event.touches[0] : null
  return event.button === 0 ? event : null
}

let finishActiveDrag: (() => void) | null = null
export const stopActiveDrag = () => finishActiveDrag?.()

/** Track one finger, including release/cancellation outside the control. */
export const trackDrag = (start: DragInput, move: (point: DragPoint) => void, end: (point: DragPoint) => void) => {
  const initial = getDragPoint(start)
  if (!initial) return
  stopActiveDrag()
  let last = initial
  let active = true
  const touchId = 'touches' in start ? start.touches[0].identifier : null

  const finish = () => {
    if (!active) return
    active = false
    document.removeEventListener('mousemove', mousemove)
    document.removeEventListener('mouseup', mouseup)
    document.removeEventListener('touchstart', touchstart, true)
    document.removeEventListener('touchmove', touchmove)
    document.removeEventListener('touchend', touchend)
    document.removeEventListener('touchcancel', finish)
    window.removeEventListener('blur', finish)
    if (finishActiveDrag === finish) finishActiveDrag = null
    // Use the last rendered point even when the system supplies an empty TouchList.
    end(last)
  }
  const mousemove = (event: MouseEvent) => {
    if (event.buttons === 0) {
      finish()
      return
    }
    last = event
    move(last)
  }
  const mouseup = (event: MouseEvent) => {
    last = event
    finish()
  }
  const touchstart = (event: TouchEvent) => {
    if (event.touches.length > 1) finish()
  }
  const touchmove = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      finish()
      return
    }
    const point = Array.from(event.touches).find(touch => touch.identifier === touchId)
    if (!point) return
    if (event.cancelable) event.preventDefault()
    last = point
    move(last)
  }
  const touchend = (event: TouchEvent) => {
    if (event.touches.length && !Array.from(event.changedTouches).some(touch => touch.identifier === touchId)) return
    finish()
  }
  finishActiveDrag = finish
  if (touchId === null) {
    document.addEventListener('mousemove', mousemove)
    document.addEventListener('mouseup', mouseup)
  }
  else {
    document.addEventListener('touchstart', touchstart, true)
    document.addEventListener('touchmove', touchmove, { passive: false })
    document.addEventListener('touchend', touchend)
    document.addEventListener('touchcancel', finish)
  }
  window.addEventListener('blur', finish)
  return finish
}
