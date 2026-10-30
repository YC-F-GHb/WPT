<template>
  <button class="move-handler" aria-label="移动选中元素" v-tooltip="'按住拖动以移动元素'" @mousedown.stop.prevent="start" @touchstart.stop.prevent="emit('move', $event)" @click.stop @dblclick.stop>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
</template>
<script setup lang="ts">
const emit = defineEmits<{(event:'move', e:MouseEvent|TouchEvent):void}>()
const start = (e:MouseEvent) => {
  if (e.button === 0)emit('move', e)
}
</script>
<style scoped>
.move-handler {position:absolute;width:18px;height:18px;transform:translate(-50%,-50%);padding:2px;display:flex;align-items:center;justify-content:center;border:0;border-radius:0;background:transparent;color:#425b7c;box-shadow:none;cursor:move;touch-action:none;pointer-events:auto;z-index:5;}
@media (any-pointer: coarse) {
  .move-handler {width:30px;height:30px;padding:8px;margin-left:16px;margin-top:16px;}
}
.move-handler:hover {color:#3455db;}
</style>
