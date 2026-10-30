<template>
  <div class="editor-header">
    <div class="left">
      <Popover trigger="click" placement="bottom-start" v-model:value="mainMenuVisible">
        <template #content>
          
          <Divider :margin="10" />
          <Popover trigger="mouseenter" placement="right-start" :offset="4">
            <template #content>
              <PopoverMenuItem @click="pptxInputRef?.open()">PPTX</PopoverMenuItem>
              <PopoverMenuItem @click="jsonInputRef?.open()">JSON</PopoverMenuItem>
            </template>
            <button class="import-menu" aria-haspopup="menu"><i-icon-park-outline:upload class="icon" />导入文件</button>
          </Popover>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="setDialogForExport('pptx')"><i-icon-park-outline:download class="icon" /> 导出文件</PopoverMenuItem>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="mainMenuVisible = false; hotkeyDrawerVisible = true"><i-icon-park-outline:command class="icon" /> 快捷操作</PopoverMenuItem>
          
          
          <Divider :margin="10" />
          <PopoverMenuItem @click="generalSettingsOpen = true; mainMenuVisible = false"><i-icon-park-outline:setting class="icon" /> 通用设置</PopoverMenuItem>
        </template>
        <div class="menu-item"><i-icon-park-outline:hamburger-button class="icon" /></div>
      </Popover>

      <div class="title">
        <Input 
          class="title-input" 
          ref="titleInputRef"
          v-model:value="titleValue" 
          @blur="handleUpdateTitle()" 
          v-if="editingTitle" 
        ></Input>
        <div 
          class="title-text"
          @click="startEditTitle()"
          :title="title"
          v-else
        >{{ title }}</div>
      </div>
    </div>

    <div class="right">
      <div class="group-menu-item">
        <div class="menu-item" v-tooltip="'幻灯片放映（F5）'" @click="enterScreening()">
          <i-icon-park-outline:ppt class="icon" />
        </div>
        <Popover trigger="click" center>
          <template #content>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreeningFromStart()"><i-icon-park-outline:slide-two class="icon" /> 从头开始</PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreening()"><i-icon-park-outline:ppt class="icon" /> 从当前页开始</PopoverMenuItem>
          </template>
          <div class="arrow-btn"><i-icon-park-outline:down class="arrow" /></div>
        </Popover>
      </div>
      
      <div class="menu-item" v-tooltip="'导出'" @click="setDialogForExport('pptx')">
        <i-icon-park-outline:download class="icon" />
      </div>
      
    </div>

    <!-- File inputs outlive hover menus while the operating-system chooser is open. -->
    <FileInput ref="pptxInputRef" style="display: none" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" @change="files => { importPPTXFile(files); mainMenuVisible = false }" />
    <FileInput ref="jsonInputRef" style="display: none" accept=".json" @change="files => { importJSON(files); mainMenuVisible = false }" />
    <Drawer
      :width="320"
      v-model:visible="hotkeyDrawerVisible"
      placement="right"
    >
      <HotkeyDoc />
      <template v-slot:title>快捷操作</template>
    </Drawer>

    <Modal :visible="generalSettingsOpen" :width="480" @closed="generalSettingsOpen = false"><GeneralSettings v-if="generalSettingsOpen" @close="generalSettingsOpen = false" /></Modal>
    <FullscreenSpin :loading="exporting" tip="正在导入..." />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useScreening from '@/hooks/useScreening'
import useImport from '@/hooks/useImport'
import type { DialogForExportTypes } from '@/types/export'

import GeneralSettings from './GeneralSettings.vue'
import Modal from '@/components/Modal.vue'
import HotkeyDoc from './HotkeyDoc.vue'
import FileInput from '@/components/FileInput.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Drawer from '@/components/Drawer.vue'
import Input from '@/components/Input.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Divider from '@/components/Divider.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { title } = storeToRefs(slidesStore)
const { enterScreening, enterScreeningFromStart } = useScreening()
const { importPPTXFile, importJSON, exporting } = useImport()

const pptxInputRef = useTemplateRef<InstanceType<typeof FileInput>>('pptxInputRef')
const jsonInputRef = useTemplateRef<InstanceType<typeof FileInput>>('jsonInputRef')
const generalSettingsOpen = ref(false)
const mainMenuVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const editingTitle = ref(false)
const titleValue = ref('')
const titleInputRef = useTemplateRef<InstanceType<typeof Input>>('titleInputRef')

const startEditTitle = () => {
  titleValue.value = title.value
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.focus())
}

const handleUpdateTitle = () => {
  slidesStore.setTitle(titleValue.value)
  editingTitle.value = false
}

const setDialogForExport = (type: DialogForExportTypes) => {
  mainStore.setDialogForExport(type)
  mainMenuVisible.value = false
}


</script>

<style lang="scss" scoped>
.editor-header {
  background-color: #E5E5E5;
  user-select: none;
  border-bottom: 1px solid $borderColor;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
}
.left, .right {
  display: flex;
  justify-content: center;
  align-items: center;
}
.menu-item {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 10px;
  border-radius: $borderRadius;
  cursor: pointer;

  .icon {
    font-size: 18px;
    color: #666;
  }
  .text {
    width: 18px;
    text-align: center;
    font-size: 17px;
  }
  .ai {
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }

  &:hover {
    background-color: #f1f1f1;
  }
}
.popover-menu-item {
  display: flex;
  padding: 8px 10px;

  .icon {
    font-size: 18px;
    margin-right: 10px;
  }
}



.import-menu {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: $borderRadius;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  .icon { font-size: 18px; margin-right: 10px; }
  &:hover, &:focus-visible { background: #f1f1f1; }
}

.group-menu-item {
  height: 30px;
  display: flex;
  margin: 0 8px;
  padding: 0 2px;
  border-radius: $borderRadius;

  &:hover {
    background-color: #f1f1f1;
  }

  .menu-item {
    padding: 0 3px;
  }
  .arrow-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }
}
.title {
  height: 30px;
  margin-left: 2px;
  font-size: 13px;

  .title-input {
    width: 200px;
    height: 100%;
    padding-left: 0;
    padding-right: 0;

    ::v-deep(input) {
      height: 28px;
      line-height: 28px;
    }
  }
  .title-text {
    min-width: 20px;
    max-width: 400px;
    line-height: 30px;
    padding: 0 6px;
    border-radius: $borderRadius;
    cursor: pointer;

    @include ellipsis-oneline();

    &:hover {
      background-color: #f1f1f1;
    }
  }
}
.github-link {
  display: inline-block;
  height: 30px;
}
</style>