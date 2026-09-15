/**
 * 平台探测 —— 只服务一件事:判断**要不要劝玩家把游戏「添加到主屏幕」**
 *
 * 起因(iOS):WebKit 会把七天没被打开过的站点的脚本可写存储整个清掉 —— localStorage
 * 里那份存档首当其冲,连 Service Worker 注册与缓存一起。而这是个放置游戏,「隔几天
 * 回来」正是它的常态节奏,于是最忠诚的玩家最容易撞上这件事。
 *
 * 唯一真正管用的办法是让游戏成为**已安装的 Web App**(添加到主屏幕):那条清存储的
 * 规则不适用于主屏幕上的 Web App。所以这里要回答的问题是:
 *   这台设备上,存档正处在「会被系统清掉」的处境里吗?
 *
 * 注意 iOS 上所有浏览器都是 WebKit(Chrome/Edge/Firefox 都只是壳),存储策略一模一样,
 * 故**不区分浏览器**:只要在 iOS 且不是已安装状态,就该劝。安装动作本身在 Safari 上
 * 最直接,文案据此写。
 *
 * 安卓 APK 与 Windows Electron 用的是应用自己的存储,不受这条规则管 —— 探测函数对
 * 它们一律返回 false。
 */

/** 一次环境取样。做成参数而不是直接读 window:探测逻辑要能被用例喂各种 UA 去验。 */
export interface EnvProbe {
  userAgent: string
  /** iOS Safari「添加到主屏幕」后 navigator.standalone 为 true */
  standalone?: boolean
  /** 已安装的 PWA(桌面 Chrome、安卓 Chrome 亦适用) */
  displayModeStandalone?: boolean
  /** iPadOS 13+ 的 Safari 把 UA 伪装成 Mac,只能靠触点数认出来 */
  maxTouchPoints?: number
}

/** 从当前窗口取样(调用点只有一个:设置页与主页那张提示卡) */
export function probeEnv(): EnvProbe {
  return {
    userAgent: navigator.userAgent,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayModeStandalone:
      typeof matchMedia === 'function' &&
      (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches),
    maxTouchPoints: navigator.maxTouchPoints
  }
}

/** iPhone / iPad / iPod;含 iPadOS 13+ 那套「伪装成 Mac」的 UA(靠触点数认) */
export function isIos(env: EnvProbe): boolean {
  if (/iPad|iPhone|iPod/.test(env.userAgent)) return true
  return /Macintosh/.test(env.userAgent) && (env.maxTouchPoints ?? 0) > 1
}

/** 已经是「装好的应用」了(主屏幕 Web App / 安装的 PWA)—— 那就没有这回事 */
export function isInstalledApp(env: EnvProbe): boolean {
  return env.standalone === true || env.displayModeStandalone === true
}

/**
 * 要不要劝安装:在 iOS 上、且还不是装好的应用。
 * 这里不判断浏览器 —— iOS 上所有浏览器共用 WebKit 的存储策略,风险一样。
 */
export function shouldSuggestInstall(env: EnvProbe): boolean {
  return isIos(env) && !isInstalledApp(env)
}
