import { onMounted, onUnmounted } from 'vue'
import { setPresentationBackground } from '@/utils/presentationBackground'

export default () => {
  let restore: (() => void) | undefined
  onMounted(() => {
    restore = setPresentationBackground() 
  })
  onUnmounted(() => restore?.())
}
