/**
 * 存档导出平台抽象 —— 单测钉住「平台分叉」：
 *
 * - Web/Electron:isNativePlatform()=false,必须走 saveAs 浏览器下载
 * - Capacitor 原生:isNativePlatform()=true,先写应用 Cache,再交给系统保存/分享
 *
 * 两条分支都必须是可用的存档出口,不能因为平台差异退化成静默失败。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/** node 测试环境无 localStorage,导出路径内部(buildExportPayload)要读它,补一个最小桩 */
class MemStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v)
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
  clear(): void {
    this.map.clear()
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemStorage(), configurable: true })

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn().mockResolvedValue({ uri: 'file:///cache/out.save' }),
  canShare: vi.fn().mockResolvedValue({ value: true }),
  share: vi.fn().mockResolvedValue({ activityType: 'files' })
}))

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' }
}))

vi.mock('@capacitor/share', () => ({
  Share: { canShare: mocks.canShare, share: mocks.share }
}))

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core')
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => false
    }
  }
})

import { Capacitor } from '@capacitor/core'
import { useUiStore } from '@/stores/ui'

const freshMocks = () => {
  mocks.writeFile.mockClear().mockResolvedValue({ uri: 'file:///cache/out.save' })
  mocks.canShare.mockClear().mockResolvedValue({ value: true })
  mocks.share.mockClear().mockResolvedValue({ activityType: 'files' })
}

describe('savePlatform 导出路径', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    freshMocks()
    useUiStore().$patch({ toasts: [] })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Web 端(非原生):下载成功,绝不触碰原生文件系统或系统分享', async () => {
    expect(Capacitor.isNativePlatform()).toBe(false)
    const { exportSaveToDevice } = await import('./savePlatform')
    const result = await exportSaveToDevice()

    expect(result).toBeNull()
    expect(mocks.writeFile).not.toHaveBeenCalled()
    expect(mocks.share).not.toHaveBeenCalled()
  })

  it('原生端:写应用 Cache 后打开系统保存/分享界面,不写公共 Documents', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    const { exportSaveToDevice } = await import('./savePlatform')
    const result = await exportSaveToDevice()

    expect(result).toBeNull()
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      directory: 'CACHE',
      encoding: 'utf8',
      data: expect.any(String)
    }))
    expect(mocks.canShare).toHaveBeenCalled()
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({
      files: ['file:///cache/out.save'],
      dialogTitle: '保存或分享存档'
    }))
  })

  it('原生端:用户取消系统分享不算导出失败', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    mocks.share.mockRejectedValueOnce(new Error('Share canceled'))
    const { exportSaveToDevice } = await import('./savePlatform')
    const result = await exportSaveToDevice()

    expect(result).toBeNull()
    expect(useUiStore().toasts.some(t => t.text.includes('导出失败'))).toBe(false)
  })
})
