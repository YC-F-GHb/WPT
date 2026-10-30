<template>
  <div @keydown.stop class="master-controls" :class="{ editing: store.masterEditingId }">
    <template v-if="!store.masterEditingId">
      <button @click="open" v-tooltip="'幻灯片母版'" aria-label="幻灯片母版"><i-icon-park-outline:layers /><span>幻灯片母版</span></button>
      <label class="layout-picker" v-tooltip="'选择版式'"><i-icon-park-outline:layout-three /><select aria-label="选择幻灯片版式" :value="store.currentSlide?.layoutId || ''" @change="apply(($event.target as HTMLSelectElement).value)">
        <option value="">选择版式</option>
        <optgroup v-for="master in store.masters" :key="master.id" :label="master.name">
          <option v-for="layout in master.layouts" :key="layout.id" :value="layout.id">{{ layout.name }}</option>
        </optgroup>
        <optgroup v-if="store.currentSlide?.layoutId" label="版式操作">
          <option value="__reset">重置当前版式</option>
          <option value="__graphics">{{ store.currentSlide.hideMasterGraphics ? '显示母版图形' : '隐藏母版图形' }}</option>
        </optgroup>
      </select></label>
    <button @click="headerFooterOpen = true" v-tooltip="'页眉 / 页脚 / 页码'" aria-label="页眉 / 页脚 / 页码"><svg class="header-footer-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/><text x="18" y="17.5" text-anchor="end" fill="currentColor" font-size="8" font-family="Arial, sans-serif" font-weight="500">1</text></svg><span>页眉 / 页脚 / 页码</span></button>
    </template>
    <template v-else>
    <button @click="headerFooterOpen = true" v-tooltip="'页眉 / 页脚 / 页码'" aria-label="页眉 / 页脚 / 页码"><svg class="header-footer-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/><text x="18" y="17.5" text-anchor="end" fill="currentColor" font-size="8" font-family="Arial, sans-serif" font-weight="500">1</text></svg><span>页眉 / 页脚 / 页码</span></button>
      <span class="badge">母版视图</span>
      <input class="name" aria-label="母版或版式名称" :value="selected?.name" @change="rename(($event.target as HTMLInputElement).value)">
      <button @click="addMaster" v-tooltip="'新建母版'" aria-label="新建母版"><i-icon-park-outline:add /><span>新建母版</span></button>
      <button @click="addLayout" v-tooltip="'新建版式'" aria-label="新建版式"><i-icon-park-outline:layout-three /><span>新建版式</span></button>
      <button @click="duplicate" v-tooltip="'复制'" aria-label="复制"><i-icon-park-outline:copy /><span>复制</span></button>
      <button @click="remove" v-tooltip="'删除'" aria-label="删除"><i-icon-park-outline:delete /><span>删除</span></button>
      <span class="divider"></span>
      <button @click="placeholder('title')" v-tooltip="'＋ 标题占位符'" aria-label="＋ 标题占位符"><i-icon-park-outline:add-text /><span>＋ 标题占位符</span></button>
      <button @click="placeholder('body')" v-tooltip="'＋ 正文占位符'" aria-label="＋ 正文占位符"><i-icon-park-outline:text /><span>＋ 正文占位符</span></button>
    </template>
  </div>
  <Modal :visible="headerFooterOpen" :width="780" @closed="headerFooterOpen = false">
    <HeaderFooterDialog v-if="headerFooterOpen" @close="headerFooterOpen = false" />
  </Modal>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import Modal from '@/components/Modal.vue'
import HeaderFooterDialog from './HeaderFooterDialog.vue'
import { nanoid } from 'nanoid'
import { useMainStore, useSlidesStore } from '@/store'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { clone, createDefaultMaster } from '@/utils/masters'
import type { SlideMaster, SlideLayout, PPTTextElement } from '@/types/slides'
const headerFooterOpen = ref(false)
const store = useSlidesStore()
const main = useMainStore()
const { addHistorySnapshot } = useHistorySnapshot()
const selected = computed(() => store.currentSlide as SlideMaster | SlideLayout)
const activeMaster = computed(() => store.masters.find(m => m.id === store.masterEditingId || m.layouts.some(l => l.id === store.masterEditingId)))
const clear = () => { main.setActiveElementIdList([]); main.setHandleElementId(''); main.setThumbnailsFocus(false) }
const open = () => { store.ensureMasters(); clear(); store.masterEditingId = store.masters[0].id; addHistorySnapshot() }
const apply = (id: string, all = false) => { if (id === '__reset') { reset(); return }; if (id === '__graphics') { toggleGraphics(); return }; if (!id) return; clear(); store.applyLayout(id, all); addHistorySnapshot() }
const reset = () => { clear(); store.resetLayout(); addHistorySnapshot() }
const toggleGraphics = () => { store.updateSlide({ hideMasterGraphics: !store.currentSlide.hideMasterGraphics }); addHistorySnapshot() }
const rename = (value: string) => { if (value.trim()) selected.value.name = value.trim(); addHistorySnapshot() }
const addMaster = () => {
  const master = createDefaultMaster(() => nanoid(10), store.viewportSize, store.viewportSize * store.viewportRatio)
  master.name = `母版 ${store.masters.length + 1}`
  store.masters.push(master); clear(); store.masterEditingId = master.id; addHistorySnapshot()
}
const addLayout = () => {
  const master = activeMaster.value
  if (!master) return
  const layout: SlideLayout = { id: nanoid(10), masterId: master.id, name: `自定义版式 ${master.layouts.length + 1}`, elements: [] }
  master.layouts.push(layout); store.syncMasterPlaceholders(); clear(); store.masterEditingId = layout.id; addHistorySnapshot()
}
const duplicate = () => {
  const master = activeMaster.value
  if (!master) return
  clear()
  if (master.id === store.masterEditingId) {
    const copy = clone(master); copy.id = nanoid(10); copy.name += ' 副本'
    copy.elements.forEach(el => { el.id = nanoid(10) })
    copy.layouts.forEach(layout => { layout.id = nanoid(10); layout.masterId = copy.id; layout.elements.forEach(el => { el.id = nanoid(10) }) })
    store.masters.push(copy); store.masterEditingId = copy.id
  }
  else {
    const copy = clone(selected.value as SlideLayout); copy.id = nanoid(10); copy.name += ' 副本'
    copy.elements.forEach(el => { el.id = nanoid(10) }); master.layouts.push(copy); store.masterEditingId = copy.id
  }
  addHistorySnapshot()
}
const remove = () => { clear(); store.removeMasterItem(store.masterEditingId); addHistorySnapshot() }
const placeholder = (role: 'title' | 'body') => {
  const w = store.viewportSize; const h = w * store.viewportRatio
  const el: PPTTextElement = { id: nanoid(10), placeholderKey: nanoid(10), name: role === 'title' ? '标题占位符' : '正文占位符', type: 'text',
    left: w * .08, top: h * (role === 'title' ? .09 : .3), width: w * .84, height: h * (role === 'title' ? .16 : .55), rotate: 0,
    defaultFontName: '', defaultColor: '#263247', fixedHeight: true, defaultFontSize: role === 'title' ? 36 : 22,
    content: `<p><span style="font-size: ${role === 'title' ? 36 : 22}px;">${role === 'title' ? '编辑标题样式' : '编辑正文样式'}</span></p>` }
  store.addElement(el); main.setActiveElementIdList([el.id]); addHistorySnapshot()
}
</script>
<style lang="scss" scoped>
.master-controls { height: 42px; flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: #f8faff; border-bottom: 1px solid #dfe5ef; font-size: 12px; overflow-x: auto; white-space: nowrap; }
button, select, .name { border: 1px solid #d9e0ec; background: white; border-radius: 5px; padding: 5px 10px; color: #34445f; font: inherit; cursor: pointer; }
button:hover { background: #eef3ff; border-color: #a4b8e2; } button:disabled { opacity: .4; cursor: default; }
.editing { background: #eef3ff; } .badge { color: #3455db; font-weight: 600; } .name { width: 135px; cursor: text; }
.close { margin-left: auto; background: #3455db; color: white; border-color: #3455db; }
.divider { height: 20px; border-left: 1px solid #ccd7e9; margin: 0 4px; }
label { display: flex; align-items: center; gap: 4px; }
</style>

<style scoped>
.master-controls { height:auto; min-height:32px; padding:0; border:0; background:transparent; overflow:visible; flex-wrap:wrap; gap:6px; }
button { display:inline-flex; align-items:center; gap:5px; min-height:32px; }
button svg,.layout-picker > svg { font-size:16px; flex-shrink:0; }
.layout-picker { gap:5px; }
.close { margin-left:0; }
</style>

<style scoped>
button { border:0; background:transparent; width:32px; height:32px; padding:6px; justify-content:center; }
button span { display:none; }
button:hover { background:transparent; color:#3455db; }
.close { background:transparent; color:#3455db; border:0; }
.layout-picker { position:relative; width:32px; height:32px; justify-content:center; }
.layout-picker select { position:absolute; inset:0; opacity:0; width:32px; cursor:pointer; }
</style>
