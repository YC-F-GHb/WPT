<template>
  <div class="wpt-editor" :key="slidesStore.masterEditingId ? 'master-editor' : 'slide-editor'">
    <EditorHeader class="layout-header" v-if="!slidesStore.masterEditingId" />
    <CanvasTool class="layout-tools" />
    <div class="layout-content">
      <MasterSidebar v-if="slidesStore.masterEditingId" class="layout-content-left" />
      <Thumbnails v-else class="layout-content-left" />
      <div class="layout-content-center">
        <Canvas class="center-body" :style="{ height: `calc(100% - ${remarkHeight}px)` }" />
        <Remark
          class="center-bottom" 
          v-model:height="remarkHeight" 
          :style="{ height: `${remarkHeight}px` }"
        />
      </div>
      <Toolbar class="layout-content-right" :style="{ width: toolbarCollapsed ? '44px' : '260px' }" @collapse-change="toolbarCollapsed = $event" />
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />
  <SymbolPanel v-if="showSymbolPanel" />
  
  <ChartDataEditorDialog />
  <LatexEditorDialog />

  <Modal
    :visible="!!dialogForExport" 
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import MasterSidebar from './MasterSidebar.vue'
import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import ChartDataEditorDialog from './ChartDataEditorDialog.vue'
import LatexEditorDialog from './LatexEditorDialog.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import SymbolPanel from './SymbolPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import Modal from '@/components/Modal.vue'

const slidesStore = useSlidesStore()
const mainStore = useMainStore()
const {
  dialogForExport,
  showSelectPanel,
  showSearchPanel,
  showNotesPanel,
  showSymbolPanel,
  showMarkupPanel,
} = storeToRefs(mainStore)

const closeExportDialog = () => mainStore.setDialogForExport('')

const toolbarCollapsed = ref(false)
const remarkHeight = ref(40)

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
.wpt-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.layout-header {
  height: 40px;
}
.layout-content {
  flex: 1;
  min-height: 0;
  height: calc(100% - 82px);
  display: flex;
}
.layout-content-left {
  width: 160px;
  height: 100%;
  flex-shrink: 0;
}
.layout-content-center {
  width: calc(100% - 160px - 260px);

  .center-top {
    height: 40px;
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}
</style>

<style scoped>.layout-tools { flex-shrink: 0; }</style>

<style scoped>.layout-content-center { flex:1; min-width:0; width:auto; }.layout-content-right { flex-shrink:0; }</style>
