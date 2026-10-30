<template>
  <div class="toolbar" :class="{ collapsed }">
    <div class="panel-heading"><button class="collapse-button" :aria-label="collapsed ? '展开右侧面板' : '折叠右侧面板'" v-tooltip="collapsed ? '展开面板' : '折叠面板'" @click="collapsed = !collapsed"><i-icon-park-outline:left v-if="collapsed" /><i-icon-park-outline:right v-else /></button></div>
    <div class="icon-tabs" v-if="collapsed">
      <button v-for="tab in currentTabs" :key="tab.key" :class="{ active: toolbarState === tab.key }" :aria-pressed="toolbarState === tab.key" :aria-label="tab.label" v-tooltip="tab.label" @click="setToolbarState(tab.key); collapsed = false">
        <i-icon-park-outline:play v-if="tab.key === ToolbarStates.EL_ANIMATION" />
        <i-icon-park-outline:switch v-else-if="tab.key === ToolbarStates.SLIDE_ANIMATION" />
        <i-icon-park-outline:move v-else-if="tab.key === ToolbarStates.EL_POSITION || tab.key === ToolbarStates.MULTI_POSITION" />
        <i-icon-park-outline:graphic-design v-else />
      </button>
    </div>
    <nav v-if="!collapsed" class="panel-tabs" aria-label="右侧属性面板">
      <button v-for="tab in currentTabs" :key="tab.key" type="button"
        :class="{ active: toolbarState === tab.key }" :aria-pressed="toolbarState === tab.key"
        @click="setToolbarState(tab.key)">{{ tab.label }}</button>
    </nav>
    <div class="content" v-if="!collapsed">
      <component :is="currentPanelComponent"></component>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import { ToolbarStates } from '@/types/toolbar'

import ElementStylePanel from './ElementStylePanel/index.vue'
import ElementPositionPanel from './ElementPositionPanel.vue'
import ElementAnimationPanel from './ElementAnimationPanel.vue'
import SlideDesignPanel from './SlideDesignPanel/index.vue'
import SlideAnimationPanel from './SlideAnimationPanel.vue'
import MultiPositionPanel from './MultiPositionPanel.vue'
import MultiStylePanel from './MultiStylePanel.vue'

const collapsed = ref(false)
const emit = defineEmits<{(event: 'collapse-change', value: boolean): void}>()
watch(collapsed, value => emit('collapse-change', value))
const mainStore = useMainStore()
const { activeElementIdList, activeElementList, activeGroupElementId, toolbarState } = storeToRefs(mainStore)

const elementTabs = [
  { label: '样式', key: ToolbarStates.EL_STYLE },
  { label: '位置', key: ToolbarStates.EL_POSITION },
  { label: '动画', key: ToolbarStates.EL_ANIMATION },
]
const slideTabs = [
  { label: '设计', key: ToolbarStates.SLIDE_DESIGN },
  { label: '切换', key: ToolbarStates.SLIDE_ANIMATION },
  { label: '动画', key: ToolbarStates.EL_ANIMATION },
]
const multiSelectTabs = [
  { label: '样式（多选）', key: ToolbarStates.MULTI_STYLE },
  { label: '位置（多选）', key: ToolbarStates.MULTI_POSITION },
]

const setToolbarState = (value: ToolbarStates) => {
  mainStore.setToolbarState(value)
}

const currentTabs = computed(() => {
  if (!activeElementIdList.value.length) return slideTabs
  else if (activeElementIdList.value.length > 1) {
    if (!activeGroupElementId.value) return multiSelectTabs

    const activeGroupElement = activeElementList.value.find(item => item.id === activeGroupElementId.value)
    if (activeGroupElement) return elementTabs
    return multiSelectTabs
  }
  return elementTabs
})

watch(currentTabs, () => {
  const currentTabsValue: ToolbarStates[] = currentTabs.value.map(tab => tab.key)
  if (!currentTabsValue.includes(toolbarState.value)) {
    mainStore.setToolbarState(currentTabsValue[0])
  }
})

const currentPanelComponent = computed(() => {
  const panelMap = {
    [ToolbarStates.EL_STYLE]: ElementStylePanel,
    [ToolbarStates.EL_POSITION]: ElementPositionPanel,
    [ToolbarStates.EL_ANIMATION]: ElementAnimationPanel,
    [ToolbarStates.SLIDE_DESIGN]: SlideDesignPanel,
    [ToolbarStates.SLIDE_ANIMATION]: SlideAnimationPanel,
    [ToolbarStates.MULTI_STYLE]: MultiStylePanel,
    [ToolbarStates.MULTI_POSITION]: MultiPositionPanel,
  }
  return panelMap[toolbarState.value] || null
})
</script>

<style lang="scss" scoped src="./panel.scss"></style>
