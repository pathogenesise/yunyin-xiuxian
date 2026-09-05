<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCurrentCaveEvent, chooseCaveOption } from '@/core/earlyGameService'
import type { CaveEvent } from '@/types'

const event = ref<CaveEvent | null>(null)
const remaining = ref(0)
let timer: number | undefined

const locationNames: Record<string, string> = {
  field: '灵田',
  furnace: '丹炉',
  library: '藏经阁',
  array: '聚灵阵',
  garden: '灵兽园'
}

function refresh() {
  event.value = getCurrentCaveEvent()
  if (event.value) {
    remaining.value = Math.max(0, Math.ceil((event.value.expiresAt - Date.now()) / 1000))
  }
}

function handleChoose(index: number) {
  chooseCaveOption(index)
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
const locationLabel = computed(() =>
  event.value ? locationNames[event.value.location] ?? '未知' : ''
)
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
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-ink">洞府巡游</h3>
              <span class="rounded bg-jade/15 px-2 py-0.5 text-xs text-jade">{{
                locationLabel
              }}</span>
            </div>
            <span class="text-sm text-ink/50">{{ remaining }}秒</span>
          </div>
          <div class="space-y-2">
            <h4 class="font-semibold text-ink">{{ event?.title }}</h4>
            <p class="text-sm text-ink/70">{{ event?.desc }}</p>
          </div>
          <div class="space-y-2">
            <button
              v-for="(opt, idx) in event?.options ?? []"
              :key="idx"
              class="w-full rounded border border-ink/15 bg-paper px-4 py-3 text-left transition hover:border-jade hover:bg-jade/5"
              @click="handleChoose(idx)"
            >
              <div class="flex items-start justify-between">
                <span class="font-semibold text-ink">{{ opt.label }}</span>
              </div>
              <div class="mt-1 text-sm text-ink/60">{{ opt.effect }}</div>
            </button>
          </div>
          <button
            class="w-full rounded bg-ink/10 px-4 py-2 text-sm text-ink/70 transition hover:bg-ink/20"
            @click="handleIgnore"
          >
            离开
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
