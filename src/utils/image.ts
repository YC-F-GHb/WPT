import { prepareImageFile } from './imageCompression'
import { isLocalImage } from './security'
interface ImageSize {
  width: number
  height: number
}

/**
 * 获取图片的原始宽高
 * @param src 图片地址
 */
export const getImageSize = (src: string): Promise<ImageSize> => {
  return new Promise((resolve, reject) => {
    if (!isLocalImage(src)) { reject(new Error('仅支持本地 PNG/JPEG/GIF/WebP 图片')); return }
    const img = document.createElement('img')
    img.src = src
    img.style.opacity = '0'
    document.body.appendChild(img)

    img.onload = () => {
      const imgWidth = img.clientWidth
      const imgHeight = img.clientHeight
    
      img.onload = null
      img.onerror = null

      document.body.removeChild(img)

      resolve({ width: imgWidth, height: imgHeight })
    }

    img.onerror = () => {
      img.onload = null
      img.onerror = null
    }
  })
}

/**
 * 读取图片文件的dataURL
 * @param file 图片文件
 */
export const getImageDataURL = async (file: File): Promise<string> => {
  const prepared = await prepareImageFile(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(reader.result as string)
    })
    reader.onerror = () => reject(new Error('无法读取图片文件'))
    reader.readAsDataURL(prepared)
  })
}

/**
 * 判断是否为SVG代码字符串
 * @param text 待验证文本
 */
export const isSVGString = (text: string): boolean => {
  const svgRegex = /<svg[\s\S]*?>[\s\S]*?<\/svg>/i
  if (!svgRegex.test(text)) return false

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'image/svg+xml')
    return doc.documentElement.nodeName === 'svg'
  } 
  catch {
    return false
  }
}

/**
 * SVG代码转文件
 * @param svg SVG代码
 */
export const svg2File = (svg: string): File => {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return new File([blob], `${Date.now()}.svg`, { type: 'image/svg+xml' })
}