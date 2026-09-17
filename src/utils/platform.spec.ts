/**
 * 平台探测验收 —— 「该不该劝装到主屏幕」这件事,判据比文案更要紧
 *
 * 这条判据管的是**说错话的代价**:在不该出现的平台(iOS 之外)弹一句「iOS 会清掉你的
 * 存档」,玩家会当成游戏在胡说;在已经装好的应用里还劝人安装,更像 bug。故两种误判
 * 各钉一条:
 *   一 安卓 APK / Windows 桌面 / 桌面浏览器:**一律不许出现**(它们用应用自己的存储)
 *   二 已经是主屏幕应用(navigator.standalone 或 display-mode: standalone):不许再劝
 * 而该出现的必须出现:iOS 上未安装 —— 包括 Chrome/Edge 这些壳(共用 WebKit 策略),
 * 以及 iPadOS 13+ 那套把自己伪装成 Mac 的 UA。
 */
import { describe, expect, it } from 'vitest'
import { isIos, isInstalledApp, shouldSuggestInstall, type EnvProbe } from './platform'

const UA = {
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  ipadOsAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  electron: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) yunyin/1.33.0 Chrome/128.0.0.0 Electron/39.0.0 Safari/537.36'
}

const env = (userAgent: string, rest: Partial<EnvProbe> = {}): EnvProbe => ({ userAgent, ...rest })

describe('平台探测 · 要不要劝「添加到主屏幕」', () => {
  it('iOS 上未安装:该劝 —— Safari 与 Chrome 壳一视同仁,风险相同', () => {
    expect(shouldSuggestInstall(env(UA.iosSafari))).toBe(true)
    expect(shouldSuggestInstall(env(UA.iosChrome))).toBe(true)
    // iPadOS 13+ 伪装成 Mac,只能靠触点数认出来;真 Mac 没有触点,不该被劝
    expect(shouldSuggestInstall(env(UA.ipadOsAsMac, { maxTouchPoints: 5 }))).toBe(true)
    expect(shouldSuggestInstall(env(UA.macSafari, { maxTouchPoints: 0 }))).toBe(false)
  })

  it('iOS 之外一律不劝:安卓、Windows 桌面、Mac 都不吃 WebKit 那套清存储规则', () => {
    expect(shouldSuggestInstall(env(UA.android))).toBe(false)
    expect(shouldSuggestInstall(env(UA.electron))).toBe(false)
    expect(shouldSuggestInstall(env(UA.macSafari))).toBe(false)
  })

  it('已经装好了就不再劝:主屏幕 Web App 不受清存储规则管', () => {
    expect(shouldSuggestInstall(env(UA.iosSafari, { standalone: true }))).toBe(false)
    expect(shouldSuggestInstall(env(UA.iosSafari, { displayModeStandalone: true }))).toBe(false)
    expect(isInstalledApp(env(UA.android, { displayModeStandalone: true }))).toBe(true)
  })

  it('「是不是 iOS」与「是不是装好了」是两件事,别混成一条', () => {
    // 装好的 iOS 仍算 iOS:哪天要按平台换文案,这条分界还得留着
    const installedIos = env(UA.iosSafari, { standalone: true })
    expect(isIos(installedIos)).toBe(true)
    expect(isInstalledApp(installedIos)).toBe(true)
    expect(shouldSuggestInstall(installedIos)).toBe(false)
  })
})
