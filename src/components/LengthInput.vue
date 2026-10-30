<template>
  <NumberInput v-bind="$attrs" :value="displayMm(value)" :min="pxToMm(min)" :max="pxToMm(max)" :step="0.1"
    @update:value="update">
    <template #prefix><slot name="prefix" /></template>
    <template #suffix><span class="unit">mm</span></template>
  </NumberInput>
</template>
<script setup lang="ts">
import NumberInput from './NumberInput.vue'
import { displayMm, pxToMm, mmToPx } from '@/utils/units'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{value: number; min?: number; max?: number; step?: number}>(), {min: 0, max: Infinity})
const emit = defineEmits<{(event: 'update:value', value: number): void}>()
const update = (value: number) => {
  // Formatting or a parent refresh must never alter stored document geometry.
  if (value === displayMm(props.value)) return
  emit('update:value', Math.max(props.min, Math.min(props.max, mmToPx(value))))
}
</script>
<style scoped>.unit { font-size: 10px; color: #8590a2; padding: 0 4px; }</style>
