/**
 * 主题服务 —— 日间 / 夜间 / 跟随系统
 * 夜间通过 html[data-theme='dark'] 覆盖 style.css 中的调色板变量,
 * 全站工具类与组件层基于这些变量,切换后整体换肤。
 */
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function applyTheme(theme: 'auto' | 'light' | 'dark'): void {
  const dark = theme === 'dark' || (theme === 'auto' && typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(DARK_QUERY).matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

type ThemeMode = 'auto' | 'light' | 'dark'

/** 挂载主题:立即应用一次,并监听系统深浅切换(auto 模式下实时跟随) */
export function initTheme(getTheme: () => ThemeMode): () => void {
  const noop = (): void => undefined
  applyTheme(getTheme())
  if (typeof globalThis.matchMedia !== 'function') return noop
  const mq = globalThis.matchMedia(DARK_QUERY)
  const onChange = (): void => {
    if (getTheme() === 'auto') applyTheme('auto')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
