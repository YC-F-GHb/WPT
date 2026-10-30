export const CANVAS_MIN = 100
export const CANVAS_MAX = 10000
export const validCanvasSize = (width: unknown, height: unknown): width is number =>
  typeof width === 'number' && typeof height === 'number' && Number.isFinite(width) && Number.isFinite(height) &&
  width >= CANVAS_MIN && height >= CANVAS_MIN && width <= CANVAS_MAX && height <= CANVAS_MAX

export const orientCanvas = (width: number, height: number, direction: 'landscape' | 'portrait') => {
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  return direction === 'landscape' ? { width: long, height: short } : { width: short, height: long }
}
export const presetCanvas = (preset: '16:9' | '4:3', direction: 'landscape' | 'portrait') => {
  const width = 1000
  return orientCanvas(width, preset === '16:9' ? 562.5 : 750, direction)
}
export const detectCanvasPreset = (width: number, height: number) => {
  const ratio = Math.max(width, height) / Math.min(width, height)
  if (Math.abs(ratio - 16/9) < 0.0001) return '16:9'
  if (Math.abs(ratio - 4/3) < 0.0001) return '4:3'
  return 'custom'
}
