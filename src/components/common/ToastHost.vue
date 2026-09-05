<template>
  <!-- 稀有天降:全屏金光一闪 -->
  <div v-if="flashId !== null" :key="flashId" class="rare-flash" />
  <div class="pointer-events-none fixed inset-x-0 top-3 z-70 flex flex-col items-center gap-1.5 px-6">
    <TransitionGroup name="toast-slide">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="max-w-90 rounded-lg border px-4 py-2 text-[13px] shadow-md font-kai tracking-wide"
        :class="KIND_CLASS[t.kind]"
      >
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useUiStore } from '@/stores/ui'
  import type { Toast } from '@/stores/ui'
  import { playSfx, type SfxName } from '@/core/audio'

  const ui = useUiStore()

  const flashId = ref<number | null>(null)

  const KIND_CLASS: Record<Toast['kind'], string> = {
    info: 'border-ink/25 text-ink-soft bg-paper',
    success: 'border-jade/60 text-jade bg-paper',
    warn: 'border-cinnabar/60 text-cinnabar bg-paper',
    rare: 'border-gold-ink/70 text-gold-ink bg-paper animate-glow-pulse'
  }

  const KIND_SFX: Record<Toast['kind'], SfxName> = { info: 'info', success: 'success', warn: 'warn', rare: 'rare' }

  // 新 toast 落地时按类型配一声提示音;稀有品级另加全屏金光
  watch(
    () => ui.toasts[ui.toasts.length - 1]?.id,
    (id, prev) => {
      if (id === undefined || id === prev) return
      const last = ui.toasts[ui.toasts.length - 1]
      if (!last) return
      playSfx(KIND_SFX[last.kind])
      if (last.kind === 'rare') {
        flashId.value = last.id
        setTimeout(() => {
          if (flashId.value === last.id) flashId.value = null
        }, 1200)
      }
    }
  )
</script>
