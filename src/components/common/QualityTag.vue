<template>
  <span class="chip-ink font-kai" :style="{ color: def.color }">{{ def.name }}</span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { QualityId } from '@/types'
  import { qualityDef } from '@/data/qualities'

  const props = defineProps<{ quality: QualityId }>()

  const def = computed(() => qualityDef(props.quality))
</script>
