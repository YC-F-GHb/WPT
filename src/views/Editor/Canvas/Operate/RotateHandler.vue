<template>
  <div class="rotate-handler"></div>
</template>

<script lang="ts" setup>

</script>

<style lang="scss" scoped>
.rotate-handler {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -25px;
  margin-left: -5px;
  border: 1px solid $themeColor;
  background-color: #fff;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  z-index: 3;

  @media (any-pointer: coarse) {
    &::after {
      content: '';
      position: absolute;
      inset: -10px;
    }
  }

  &:active {
    cursor: grabbing;
  }
}
</style>
