<template>
  <div class="wpt-screen">
    <AudienceView v-if="isAudienceMode" />
    <BaseView :changeViewMode="changeViewMode" v-else-if="viewMode === 'base'" />
    <PresenterView :changeViewMode="changeViewMode" v-else-if="viewMode === 'presenter'" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { KEYS } from '@/configs/hotkey'
import useScreening from '@/hooks/useScreening'
import usePresentationBackground from '@/hooks/usePresentationBackground'

import AudienceView from './AudienceView.vue'
import BaseView from './BaseView.vue'
import PresenterView from './PresenterView.vue'

const isAudienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience'
usePresentationBackground()

const viewMode = ref<'base' | 'presenter'>('base')

const changeViewMode = (mode: 'base' | 'presenter') => {
  viewMode.value = mode
}

const { exitScreening: _exitScreening } = useScreening()

const syncChannel = !isAudienceMode ? new BroadcastChannel('wpt-audience-sync') : null

const exitScreening = () => {
  syncChannel?.postMessage({ type: 'EXIT' })
  _exitScreening()
}

// 快捷键退出放映（观众视图中 ESC 不响应，由用户直接关闭窗口）
const keydownListener = (e: KeyboardEvent) => {
  const key = e.key.toUpperCase()
  if (key === KEYS.ESC) exitScreening()
}

onMounted(() => {
  if (!isAudienceMode) document.addEventListener('keydown', keydownListener)
})
onUnmounted(() => {
  if (!isAudienceMode) document.removeEventListener('keydown', keydownListener)
  syncChannel?.close()
})
</script>

<style lang="scss" scoped>
.wpt-screen {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  background-color: #000;
}
</style>
