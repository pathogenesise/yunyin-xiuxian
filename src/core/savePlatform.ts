/**
 * 存档导出平台抽象 —— Web/Electron 走浏览器下载,Capacitor 原生端交给系统保存。
 *
 * 背景:SettingsView 原把导出/导入整体用 `!Capacitor.isNativePlatform()` 藏起,
 * 因为 Capacitor WebView 没有 DownloadListener,`saveAs` 触发的下载在安卓上
 * 根本没着落。但存档只存本地、无法备份,卸载/清数据即永久丢失 —— 导出能力
 * 恰恰是移动端最需要的一环。原生端先写应用 Cache,再通过系统分享界面保存或发送。
 */
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { saveAs } from 'file-saver'
import { exportSaveText } from './save'
import { useUiStore } from '@/stores/ui'

/** 本机存档导出:按平台落到可被用户取走的地方,成功返回提示,失败返回 null */
export async function exportSaveToDevice(): Promise<string | null> {
  const text = exportSaveText()
  if (Capacitor.isNativePlatform()) {
    let temporaryFile = ''
    try {
      // Android 11+ 不允许应用直接写公共 Documents；旧实现无论目录不存在还是权限策略
      // 都会落入 catch，最后只会误报「存储空间不足」。先写应用私有的 Cache，
      // 再交给系统分享/文件保存界面，让用户把文件保存到网盘、文件管理器等位置。
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const file = `yunyin-xiuxian-${stamp}.save`
      const result = await Filesystem.writeFile({
        path: file,
        data: text,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })
      temporaryFile = result.uri

      const canShare = await Share.canShare()
      if (!canShare.value) {
        useUiStore().toast('当前设备没有可用的文件保存或分享应用', 'warn')
        return '系统分享不可用'
      }
      await Share.share({
        title: '云隐修仙录存档',
        files: [temporaryFile],
        dialogTitle: '保存或分享存档'
      })
      useUiStore().toast('存档已生成,请在系统界面选择保存位置', 'success')
      return null
    } catch (error) {
      // 取消分享不是导出失败，不必把正常的返回动作说成错误。
      if (error instanceof Error && error.message.toLowerCase().includes('cancel')) return null
      useUiStore().toast('存档导出失败,请检查存储空间后重试', 'warn')
      return '导出失败'
    }
  }
  /*
   * Web 端靠 `saveAs`(Blob + a[download])。
   *
   * 这条路不是处处都通:受限 WebView、部分应用内浏览器里 `URL.createObjectURL` 直接不可用,
   * 于是 saveAs 抛错 —— 而调用方是 `void exportSaveToDevice()`(不 await、不看返回值),
   * 结果玩家点「导出存档」既没文件也没提示,静默失败。导出是丢档前唯一的保险,
   * 失败必须说出来。
   */
  try {
    saveAs(new Blob([text], { type: 'application/json' }), `yunyin-xiuxian-${new Date().toISOString().slice(0, 10)}.save`)
    return null
  } catch {
    // 别承诺做不到的事:导入只认文件,没有「粘贴文本」这条路,故只指可行的办法
    useUiStore().toast('浏览器没能下载这份存档 —— 请换一个浏览器打开后再导出', 'warn')
    return '浏览器不支持下载'
  }
}
