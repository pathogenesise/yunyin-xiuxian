/**
 * 原生系统栏占位(CSS px)。
 *
 * 安卓上 CSS 的 env(safe-area-inset-bottom) 恒为 0 —— WebView 不把导航栏高度告诉页面,
 * 而我们开了边到边,内容会铺到系统按钮底下。三键导航的老机型上,底部导航条整排
 * 被盖住(玩家反馈);手势导航机型那条横杠半透明,看不出问题。
 *
 * 所以原生量好真实占位,经 window.NativeApp 桥暴露(见 MainActivity.java):
 *   底部只在「按钮真会挡住点按」时才非零(取 tappableElement,手势导航为 0);
 *   顶部是状态栏高度。
 * 非安卓平台没有这个桥 → 一律 0,页面照旧只靠 env()。
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface NativeAppBridge {
  insetTop?: () => number
  insetBottom?: () => number
}

/** 桥不存在、方法缺失、抛错、非有限数、负数 —— 都当 0,绝不能让一个坏值把布局撑爆 */
function safeInset(read: (() => number) | undefined): number {
  if (typeof read !== 'function') return 0
  try {
    const v = read()
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

/** 读一次当前占位(纯函数,便于测试与故障注入) */
export function readNativeInsets(bridge?: NativeAppBridge): { top: number; bottom: number } {
  const b = bridge ?? (globalThis as { NativeApp?: NativeAppBridge }).NativeApp
  return { top: safeInset(b?.insetTop), bottom: safeInset(b?.insetBottom) }
}

/**
 * 挂载时读一次;原生在 insets 变化(旋转、切换导航模式)时派发 nativeinsets 事件,再读。
 * 首次派发发生在页面加载前、事件丢失也无妨 —— 挂载那一次读的是原生缓存的最新值
 */
export function useNativeInsets(): { top: Ref<number>; bottom: Ref<number> } {
  const top = ref(0)
  const bottom = ref(0)
  const refresh = (): void => {
    const r = readNativeInsets()
    top.value = r.top
    bottom.value = r.bottom
  }
  onMounted(() => {
    refresh()
    window.addEventListener('nativeinsets', refresh)
  })
  onUnmounted(() => window.removeEventListener('nativeinsets', refresh))
  return { top, bottom }
}
