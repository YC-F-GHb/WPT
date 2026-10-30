<template>
  <div class="mobile-editor-header">
    <div class="history">
      <div class="history-item" :class="{ 'disable': !canUndo }" @click.stop="undo()"><i-icon-park-outline:back /> 撤销</div>
      <div class="history-item" :class="{ 'disable': !canRedo }" @click.stop="redo()"><i-icon-park-outline:next /> 重做</div>
    </div>
    <button v-if="activeElementIdList.length" class="delete-element-button" aria-label="删除选中元素" @touchstart.stop @click.stop="deleteElement()"><i-icon-park-outline:delete /></button>
    <div class="back" @click="changeMode('preview')"><i-icon-park-outline:logout /> 退出编辑</div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import useDeleteElement from '@/hooks/useDeleteElement'
import { useMainStore, useSnapshotStore } from '@/store'
import type { Mode } from '@/types/mobile'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

defineProps<{
  changeMode: (mode: Mode) => void
}>()

const { activeElementIdList } = storeToRefs(useMainStore())
const { deleteElement } = useDeleteElement()
const { canUndo, canRedo } = storeToRefs(useSnapshotStore())
const { redo, undo } = useHistorySnapshot()
</script>

<style lang="scss" scoped>
.mobile-editor-header {
  height: 50px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 18px;
  font-size: 13px;
  box-shadow: 0 0 15px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 2;
}
.history {
  display: flex;
  justify-content: center;
  align-items: center;
}
.history-item {
  margin-right: 20px;

  &.disable {
    opacity: .5;
  }
}
</style>
<style scoped>
.delete-element-button { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border:0; background:transparent; color:#42516a; font-size:13px; touch-action:manipulation; }
</style>
