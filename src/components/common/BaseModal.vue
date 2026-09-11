<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="props.open"
        class="fixed inset-0 flex items-center justify-center bg-ink/45 backdrop-blur-[2px] px-5"
        :class="props.top ? 'z-60' : 'z-50'"
        @click.self="onBackdrop"
      >
        <div
          class="modal-panel paper-grain relative w-full max-h-[82vh] flex flex-col overflow-hidden rounded-xl border border-ink/20 bg-paper shadow-2xl"
          :class="props.wide ? 'max-w-100' : 'max-w-90'"
        >
          <!-- 卷轴上缘 -->
          <header v-if="props.title || props.closable" class="relative z-10 flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
            <h3 class="font-kai text-lg tracking-[0.2em] text-ink">{{ props.title }}</h3>
            <button v-if="props.closable" class="p-1 -m-1 text-ink-faint active:scale-90" @click="emit('close')">
              <GameIcon name="x" :size="18" />
            </button>
          </header>
          <div class="relative z-10 overflow-y-auto px-5 py-3 grow">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="relative z-10 px-5 pb-5 pt-2 shrink-0">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { onUnmounted, watch } from 'vue'
  import GameIcon from './GameIcon.vue'

  const props = withDefaults(
    defineProps<{
      open: boolean
      title?: string
      closable?: boolean
      wide?: boolean
      /** 顶层弹窗:叠在普通弹窗(z-50)之上,用于详情盖列表等场景 */
      top?: boolean
    }>(),
    { title: '', closable: true, wide: false, top: false }
  )

  const emit = defineEmits<{ close: [] }>()

  function onBackdrop(): void {
    if (props.closable) emit('close')
  }

  // ---- Esc 关闭:只让最上面一层可关弹窗响应 ----
  // 多弹窗叠放(详情盖列表)时按一次 Esc 只能退最上层,不能逐层全退;
  // 不可关的顶层(离线卷轴/转世确认 `closable=false`)挡在最上时,Esc 不越层去关底下的
  type ModalEntry = { closable: boolean; close: () => void }
  const activeModals: ModalEntry[] = []
  function onWindowKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return
    const top = activeModals[activeModals.length - 1]
    if (top?.closable) {
      e.preventDefault()
      top.close()
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('keydown', onWindowKey)

  const entry: ModalEntry = { closable: props.closable, close: () => emit('close') }
  watch(
    () => props.open,
    open => {
      if (open) activeModals.push(entry)
      else {
        const i = activeModals.indexOf(entry)
        if (i >= 0) activeModals.splice(i, 1)
      }
    },
    { immediate: true }
  )
  watch(
    () => props.closable,
    c => {
      entry.closable = c
    }
  )
  onUnmounted(() => {
    const i = activeModals.indexOf(entry)
    if (i >= 0) activeModals.splice(i, 1)
  })
</script>
