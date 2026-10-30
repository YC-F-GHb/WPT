// CSS absolute length conversion, shared by editor controls and PPTX export.
export const PX_PER_INCH = 96
export const MM_PER_INCH = 25.4
export const pxToMm = (value: number) => value * MM_PER_INCH / PX_PER_INCH
export const mmToPx = (value: number) => value * PX_PER_INCH / MM_PER_INCH
export const displayMm = (value: number) => Number(pxToMm(value).toFixed(3))
export const formatLength = (value: number) => `${displayMm(value)} mm`
