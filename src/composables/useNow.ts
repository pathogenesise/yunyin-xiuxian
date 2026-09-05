/** 每秒刷新的当前时间(供倒计时类 UI 使用) */
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useNow(intervalMs = 1000): Ref<number> {
  const now = ref(Date.now())
  let timer: number | undefined
  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })
  onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer)
  })
  return now
}
