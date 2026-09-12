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
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-label="props.title || undefined"
          tabindex="-1"
          class="modal-panel paper-grain relative w-full max-h-[82vh] flex flex-col overflow-hidden rounded-xl border border-ink/20 bg-paper shadow-2xl outline-none"
          :class="props.wide ? 'max-w-100' : 'max-w-90'"
          @keydown="onPanelKeydown"
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
  import { nextTick, onUnmounted, ref, watch } from 'vue'
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

  /**
   * 焦点管理 —— 弹窗打开时,键盘焦点必须跟着进去,且不许跑出去。
   *
   * 此前弹窗只管 Esc:打开后焦点仍留在背后的按钮上,按 Tab 会一路跑到页面与底部导航
   * (实测连按六次,六次全在弹窗外),读屏用户甚至不知道有个弹窗开了。故:
   *   · 打开时记住是谁打开的,把焦点移进面板(role=dialog + aria-modal);
   *   · Tab/Shift+Tab 在面板内循环,首尾相接;
   *   · 关闭后把焦点还给打开它的那个元素。
   */
  const panelRef = ref<HTMLElement | null>(null)
  let lastFocused: HTMLElement | null = null

  function focusablesIn(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      el => !el.hasAttribute('disabled') && el.offsetParent !== null
    )
  }

  function onPanelKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return
    const panel = panelRef.value
    if (!panel) return
    const items = focusablesIn(panel)
    if (items.length === 0) {
      e.preventDefault()
      panel.focus()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement as HTMLElement | null
    const outside = !active || !panel.contains(active)
    if (e.shiftKey) {
      if (outside || active === first) {
        e.preventDefault()
        last.focus()
      }
    } else if (outside || active === last) {
      e.preventDefault()
      first.focus()
    }
  }

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
      if (open) {
        activeModals.push(entry)
        // 记住是谁打开的,关闭后把焦点还回去(键盘用户不会"掉到页面顶端")
        lastFocused = document.activeElement as HTMLElement | null
        void nextTick(() => panelRef.value?.focus())
      } else {
        const i = activeModals.indexOf(entry)
        if (i >= 0) activeModals.splice(i, 1)
        const back = lastFocused
        lastFocused = null
        void nextTick(() => {
          if (back && back.isConnected) back.focus()
        })
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
