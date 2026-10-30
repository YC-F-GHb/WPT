<template>
  <aside class="master-sidebar">
    <div class="heading">母版与版式<span>公共元素请在母版中编辑</span></div>
    <div v-for="master in store.masters" :key="master.id" class="family">
      <button class="card parent" :class="{ active: store.masterEditingId === master.id }" @click="select(master.id)">
        <ThumbnailSlide :slide="master" :size="136" /><span>{{ master.name }}</span>
      </button>
      <button v-for="layout in master.layouts" :key="layout.id" class="card child" :class="{ active: store.masterEditingId === layout.id }" @click="select(layout.id)">
        <ThumbnailSlide :slide="layout" :size="115" /><span>{{ layout.name }}</span>
      </button>
    </div>
    <p v-if="!store.masters.length">点击“新建母版”开始</p>
  </aside>
</template>
<script lang="ts" setup>
import { useSlidesStore, useMainStore } from '@/store'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
const store = useSlidesStore()
const main = useMainStore()
const select = (id: string) => { main.setActiveElementIdList([]); main.setHandleElementId(''); main.setThumbnailsFocus(false); store.masterEditingId = id }
</script>
<style scoped>
.master-sidebar { overflow-y: auto; background: #f7f8fc; padding: 12px 8px; box-sizing: border-box; }
.heading { font-size: 12px; font-weight: 600; color: #42516a; margin-bottom: 14px; }
.heading span { display: block; font-size: 10px; color: #8b95a7; margin-top: 4px; font-weight: normal; }
.card { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 100%; padding: 5px 2px; margin-bottom: 10px; background: transparent; border: 2px solid transparent; border-radius: 5px; cursor: pointer; }
.card.active { border-color: #4266e8; background: #e9eeff; }
.card span { font-size: 11px; color: #536078; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.child { width: calc(100% - 18px); margin-left: 18px; }
.family { margin-bottom: 18px; }
</style>
