<template>
  <component :is="icon" :size="props.size" :stroke-width="1.8" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { iconOf } from '@/ui/icons'

  const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 })

  const icon = computed(() => iconOf(props.name))
</script>
