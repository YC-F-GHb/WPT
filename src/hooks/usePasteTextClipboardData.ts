import { pasteCustomClipboardString } from '@/utils/clipboard'
import { parseText2Paragraphs } from '@/utils/textParser'
import { escapeHTML } from '@/utils/security'
import useCreateElement from '@/hooks/useCreateElement'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'

interface PasteTextClipboardDataOptions { onlySlide?: boolean; onlyElements?: boolean }

export default () => {
  const { createTextElement } = useCreateElement()
  const { addElementsFromData, addSlidesFromData } = useAddSlidesOrElements()
  const pasteTextClipboardData = (text: string, options?: PasteTextClipboardDataOptions) => {
    const data = pasteCustomClipboardString(text)
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      if (data.type === 'elements' && !options?.onlySlide) { addElementsFromData(data.data); return }
      if (data.type === 'slides' && !options?.onlyElements) { addSlidesFromData(data.data); return }
    }
    if (!options?.onlySlide && !options?.onlyElements) {
      createTextElement({ left: 0, top: 0, width: 600, height: 50 }, { content: parseText2Paragraphs(escapeHTML(text)) })
    }
  }
  return { pasteTextClipboardData }
}
