/**
 * 自动回收 —— 装备入包前的第一道闸(Phase 26.2)
 * 应有之物(O):无论在线(战斗掉落/事件/镇压)还是离线(挂机结算),
 * 一切装备在进入行囊前都要先过一遍回收裁决;
 * 命中回收规则(分解勾选档 / 智能收纳判无缘)的,不入包、直接化尘。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mulberry32, RandomService } from '@/utils/random'
import { generateEquipment } from './equipGen'
import { acquireEquipment } from './loot'
import { shouldAutoRecycle } from './smartKeep'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { useSettingsStore } from '@/stores/settings'
import { qualityDef } from '@/data/qualities'
import { DECOMPOSE_DUST } from '@/data/constants'
import type { EquipmentInstance, QualityId } from '@/types'

describe('自动回收 · 装备入包前的第一道闸', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mk(quality: QualityId): EquipmentInstance {
    const rng = new RandomService(mulberry32(11))
    const inst = generateEquipment(3, rng, { slot: 'weapon' })
    return { ...inst, quality }
  }

  function bagUids(): string[] {
    return useInventoryStore().items.map(it => it.uid)
  }

  it('凡良(分解勾选档)拾取即化尘,不入行囊,器灵尘到账', () => {
    const resources = useResourcesStore()
    for (const q of ['mortal', 'fine'] as const) {
      const dustBefore = resources.dust
      const item = mk(q)
      const line = acquireEquipment(item).line
      expect(bagUids()).not.toContain(item.uid)
      expect(resources.dust).toBe(dustBefore + (DECOMPOSE_DUST[qualityDef(q).rank] ?? 1))
      expect(line).toContain('自动回收')
      expect(line).toContain('器灵尘')
    }
  })

  it('灵品及以上(未勾分解,亦足保留线)照常入包', () => {
    const item = mk('spirit')
    acquireEquipment(item)
    expect(bagUids()).toContain(item.uid)
  })

  it('上锁的分解档装备不会被误回收', () => {
    const item = mk('mortal')
    item.locked = true
    acquireEquipment(item)
    expect(bagUids()).toContain(item.uid)
  })

  it('智能收纳开启后,低于保留线又无核心词条的精品也会化尘', () => {
    useSettingsStore().smartKeep.enabled = true
    const resources = useResourcesStore()
    const item = mk('excellent') // 精品 rank2,非勾选档 → 交由智能收纳裁决
    acquireEquipment(item)
    expect(bagUids()).not.toContain(item.uid)
    expect(resources.dust).toBeGreaterThanOrEqual(DECOMPOSE_DUST[2] ?? 1)
  })

  it('新手馈赠(forceKeep)不受回收规则影响,必入包', () => {
    const starter = mk('mortal')
    acquireEquipment(starter, { forceKeep: true })
    expect(bagUids()).toContain(starter.uid)
  })

  it('行囊满时,保留下来的新件仍按老规矩腾退包内无缘旧件', () => {
    useSettingsStore().smartKeep.enabled = true
    const inventory = useInventoryStore()
    // 塞满 120 件凡品(老规矩积压的垃圾)
    for (let i = 0; i < 120; i += 1) inventory.addEquipment(mk('mortal'))
    expect(inventory.bagFull).toBe(true)
    const keep = mk('spirit')
    acquireEquipment(keep)
    expect(bagUids()).toContain(keep.uid)
    expect(inventory.items.length).toBeLessThanOrEqual(120)
  })

  it('回收裁决无随机性:同件装备重复判定结果一致(在线/离线一致的基础)', () => {
    const junk = mk('mortal')
    expect(shouldAutoRecycle(junk)).toBe(true)
    expect(shouldAutoRecycle({ ...junk, uid: 'dummy' })).toBe(true)
    expect(shouldAutoRecycle(mk('spirit'))).toBe(false)
  })
})
