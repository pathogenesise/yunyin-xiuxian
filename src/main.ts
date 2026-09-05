import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import { router } from './router'
import { migrateLocalSchema, preflightScan } from './utils/storage'
import { useUiStore } from './stores/ui'
import './style.css'

// 启动前扫描损坏存档 + 结构升级,避免白屏
const corrupted = preflightScan()
migrateLocalSchema()

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[全局异常]', info, err)
  try {
    useUiStore().toast('出现异常,已记录。若持续出现请尝试刷新', 'warn')
  } catch {
    // UI 尚未就绪时静默
  }
}

app.mount('#app')

if (corrupted.length > 0) {
  useUiStore().corruptedNotice = corrupted
  useUiStore().toast('检测到部分存档数据异常,已为你隔离修复', 'warn')
}
