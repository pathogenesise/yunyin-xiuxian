<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCurrentEnlightenment, chooseEnlightenment } from '@/core/earlyGameService'
import type { EnlightenmentEvent } from '@/types'

const event = ref<EnlightenmentEvent | null>(null)
const remaining = ref(0)
let timer: number | undefined

function refresh() {
  event.value = getCurrentEnlightenment()
  if (event.value) {
    remaining.value = Math.max(0, Math.ceil((event.value.expiresAt - Date.now()) / 1000))
  }
}

function handleChoose(index: number) {
  chooseEnlightenment(index)
  event.value = null
}

function handleIgnore() {
  event.value = null
}

onMounted(() => {
  refresh()
  timer = window.setInterval(refresh, 1000)
})

onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer)
})

const show = computed(() => event.value !== null)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4"
        @click.self="handleIgnore"
      >
        <div class="w-full max-w-md space-y-4 rounded-lg border border-ink/20 bg-paper p-6 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-ink">悟道顿悟</h3>
            <span class="text-sm text-ink/50">{{ remaining }}秒</span>
          </div>
          <p class="text-sm text-ink/70">灵光一闪,选择一项增益:</p>
          <div class="space-y-2">
            <button
              v-for="(opt, idx) in event?.options ?? []"
              :key="idx"
              class="w-full rounded border border-ink/15 bg-paper px-4 py-3 text-left transition hover:border-jade hover:bg-jade/5"
              @click="handleChoose(idx)"
            >
              <div class="font-semibold text-ink">{{ opt.label }}</div>
              <div class="text-sm text-ink/60">{{ opt.desc }}</div>
            </button>
          </div>
          <button
            class="w-full rounded bg-ink/10 px-4 py-2 text-sm text-ink/70 transition hover:bg-ink/20"
            @click="handleIgnore"
          >
            忽略
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
