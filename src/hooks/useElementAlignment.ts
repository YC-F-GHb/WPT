import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { alignmentUnits, alignElements, type AlignmentTarget, type AlignmentAction } from '@/utils/alignment'
import useHistorySnapshot from './useHistorySnapshot'

const targetPreference = ref<AlignmentTarget | 'auto'>('auto')
export default () => {
  const store=useSlidesStore()
  const { activeElementIdList, activeGroupElementId }=storeToRefs(useMainStore())
  const { addHistorySnapshot }=useHistorySnapshot()
  const count=computed(() => alignmentUnits(store.currentSlide.elements, activeElementIdList.value, activeGroupElementId.value).length)
  const target=computed<AlignmentTarget>({get:() => targetPreference.value === 'auto' ? count.value>1 ? 'selection' : 'slide' : targetPreference.value,set:value => {targetPreference.value=value}})
  const canAlign=computed(() => count.value >= (target.value === 'selection' ? 2 : 1))
  const canDistribute=computed(() => count.value >= (target.value === 'selection' ? 3 : 2))
  const run=(action: AlignmentAction, reference: AlignmentTarget = target.value) => {
    const minimum=action.startsWith('distribute-') ? reference === 'selection' ? 3 : 2 : reference === 'selection' ? 2 : 1
    if (count.value < minimum) return
    const current=store.currentSlide.elements
    const elements=alignElements(current,activeElementIdList.value,action,reference,store.viewportSize,store.viewportSize*store.viewportRatio,activeGroupElementId.value)
    if (elements===current) return
    store.updateSlide({elements})
    addHistorySnapshot()
  }
  return {target,count,canAlign,canDistribute,run}
}
