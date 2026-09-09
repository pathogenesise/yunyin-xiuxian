/**
 * 存档导出平台抽象 —— Web/Electron 走浏览器下载,Capacitor 原生端写 Documents。
 *
 * 背景:SettingsView 原把导出/导入整体用 `!Capacitor.isNativePlatform()` 藏起,
 * 因为 Capacitor WebView 没有 DownloadListener,`saveAs` 触发的下载在安卓上
 * 根本没着落。但存档只存本地、无法备份,卸载/清数据即永久丢失 —— 导出能力
 * 恰恰是移动端最需要的一环。原生端改用 @capacitor/filesystem 写 Documents:
 * 卸载前把 .save 文件导出,重装后经设置页导入恢复。
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { saveAs } from 'file-saver'
import { exportSaveText } from './save'
import { useUiStore } from '@/stores/ui'

/** 本机存档导出:按平台落到可被用户取走的地方,成功返回提示,失败返回 null */
export async function exportSaveToDevice(): Promise<string | null> {
  const text = exportSaveText()
  if (Capacitor.isNativePlatform()) {
    try {
      // Documents 在部分 Android 上需运行时授权,先问一句,被拒就如实告知
      const perm = await Filesystem.requestPermissions()
      if (perm.publicStorage === 'denied') return '存储权限被拒绝,无法导出存档'
      const stamp = new Date().toISOString().slice(0, 10)
      const file = `yunyin-xiuxian-${stamp}.save`
      await Filesystem.writeFile({
        path: `Export/${file}`,
        data: text,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      })
      useUiStore().toast(`已导出到「文档/Export/${file}」`, 'success')
      return null
    } catch (err) {
      // 写盘失败(存储不可用/权限异常)明确告知,不静默
      useUiStore().toast('存档导出失败,请检查存储空间后重试', 'warn')
      return '导出失败'
    }
  }
  saveAs(new Blob([text], { type: 'application/json' }), `yunyin-xiuxian-${new Date().toISOString().slice(0, 10)}.save`)
  return null
}
