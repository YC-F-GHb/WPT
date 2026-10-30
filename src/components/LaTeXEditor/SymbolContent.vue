<template>
  <div class="symbol-content" v-html="sanitizeHTML(svg)"></div>
</template>

<script lang="ts" setup>
import { sanitizeHTML } from '@/utils/security'
import { computed } from 'vue'
import { hfmath } from './hfmath'

const props = defineProps<{
  latex: string
}>()

const svg = computed(() => {
  const eq = new hfmath(props.latex)
  return eq.svg({
    SCALE_X: 10,
    SCALE_Y: 10,
  })
})
</script>
