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
   * Web 端靠 `saveAs`(Blob + a[download]) + **剪贴板兜底**。
   *
   * 下载本身不是处处都通:受限 WebView、应用内浏览器(taptap 也是其一)里
   * a[download] 常被**静默吞掉** —— 不抛错、也没文件,旧实现于是像点了空气。
   * 故在挂下载之外,一律把存档文本写进剪贴板:无论下载成不成,玩家都拿得走。
   * 提示语把这条退路讲明,不再假装「已导出」。
   *
   * 成功语义:真落盘的下载才算数(返回 null → 记账「上次导出」);
   * 只有剪贴板时返回提示(不记账 —— 文本躺在剪贴板里不算持久备份)。
   */
  const file = `yunyin-xiuxian-${new Date().toISOString().slice(0, 10)}.save`

  // 剪贴板先行:写它要有用户手势 + secure context,导出按钮的单击正好给足。
  // 剪贴板不可用(非安全上下文/被禁)不影响下载那条路。
  let clipped = false
  try {
    await navigator.clipboard.writeText(text)
    clipped = true
  } catch {
    /* 剪贴板不可用,静默 —— 下载路还在 */
  }

  let downloaded = false
  try {
    saveAs(new Blob([text], { type: 'application/json' }), file)
    downloaded = true
  } catch {
    /* 下载被拦,看剪贴板 */
  }

  if (downloaded && clipped) {
    useUiStore().toast(`已导出「${file}」(存档文本也已复制到剪贴板备用)`, 'success')
    return null
  }
  if (downloaded) {
    useUiStore().toast(`已导出「${file}」`, 'success')
    return null
  }
  if (clipped) {
    useUiStore().toast('浏览器没能下载 —— 存档文本已复制到剪贴板,新建文本粘贴并另存为 .save 即可导入', 'warn')
    return '存档已复制到剪贴板'
  }
  useUiStore().toast('浏览器既不能下载也复制不了存档,请换一个浏览器打开后再导出', 'warn')
  return '浏览器不支持导出'
}
