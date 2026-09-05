<template>
  <div class="flex items-baseline gap-2 px-1">
    <span class="brush-bar h-3 w-0.75 rounded bg-cinnabar/80" />
    <h2 class="font-kai text-[15px] tracking-[0.25em] text-ink">{{ title }}</h2>
    <span v-if="hint" class="text-[11px] text-ink-faint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ title: string; hint?: string }>()
</script>
