<template>
  <div class="track-ink w-full" :style="{ height: `${props.height}px` }">
    <div class="bar-fill" :style="{ width, background: props.color }" />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      /** 0~1 */
      value: number
      color?: string
      height?: number
    }>(),
    { color: 'var(--color-jade)', height: 6 }
  )

  const width = computed(() => `${Math.max(0, Math.min(1, props.value)) * 100}%`)
</script>
