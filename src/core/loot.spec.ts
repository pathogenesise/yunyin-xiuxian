/**
 * 自动回收 —— 装备入包前的第一道闸(Phase 26.2)
 * 应有之物(O):无论在线(战斗掉落/事件/镇压)还是离线(挂机结算),
 * 一切装备在进入行囊前都要先过一遍回收裁决;
 * 命中回收规则(分解勾选档 / 智能收纳判无缘)的,不入包、直接化尘。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { rng } from '@/utils/random'
import { afterWin, acquireEquipment, artifactDropWeight, randomDropArtifact } from './loot'
import { ARTIFACTS, artifactDef } from '@/data/artifacts'
import { regionDef } from '@/data/regions'
import { usePlayerStore } from '@/stores/player'
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

  // 一件好判的凡俗道袍:不带套、无词条 —— 判定只看品质。
  // (此前用 generateEquipment 随手生成的件:模板可能成套、词条可能条条近满,
  //  于是「这件算不算垃圾」被随机模板搅浑,判据不再只测它想测的那条规则。)
  let seq = 0
  function mk(quality: QualityId): EquipmentInstance {
    seq += 1
    return { uid: `u${seq}`, templateId: 'b_qingyun', quality, tier: 3, level: 0, affixes: [] }
  }

  function bagUids(): string[] {
    return useInventoryStore().items.map(it => it.uid)
  }

  // ISS-030:rng.chance 不钳制(rand()<p),法宝 ×6×luck / doubleDropRate 等倍率堆叠
  // 一旦把 p 堆出 (0,1) 就会变成"必然掉落"或"永不掉落"。此不变量兜住任何未来平衡数据。
  it('ISS-030:afterWin 里每个概率输入都钳在 [0,1] 内', () => {
    const player = usePlayerStore()
    player.initCharacter('概率钳制', { roots: [] } as never)
    const spy = vi.spyOn(rng, 'chance').mockImplementation((p: number) => {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
      return false
    })
    try {
      const region = regionDef('qingyun')!
      afterWin(region, 1, true)
      expect(spy).toHaveBeenCalled()
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('智能收纳开启时,凡良(分解勾选档)拾取即化尘,不入行囊,器灵尘到账', () => {
    useSettingsStore().smartKeep.enabled = true
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

  it('总闸:智能收纳未开启时,凡良(默认分解勾选档)照常入包,不再自动回收', () => {
    expect(useSettingsStore().smartKeep.enabled).toBe(false)
    for (const q of ['mortal', 'fine'] as const) {
      const item = mk(q)
      acquireEquipment(item)
      expect(bagUids()).toContain(item.uid)
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
    useSettingsStore().smartKeep.enabled = true
    const junk = mk('mortal')
    expect(shouldAutoRecycle(junk)).toBe(true)
    expect(shouldAutoRecycle({ ...junk, uid: 'dummy' })).toBe(true)
    expect(shouldAutoRecycle(mk('spirit'))).toBe(false)
  })
})

/**
 * 法宝掉落的取样口径 —— 「高界该掉高界的东西」不能只写在注释里。
 *
 * 池子本身一直是「minTier ≤ 当前层级」(旧法宝仍可能掉,图鉴要补齐),
 * 但权重从前只按品质折算:凡品 40 对神品 7.7,于是到了混沌海,
 * 掉出来的多半还是人间界的墨玉葫芦 —— 本界域的法宝反而撞不见。
 * 现加一层就近加成(见 loot.artifactDropWeight),此处钉住它的三条承诺:
 * 同品质下近者更重、旧物不被关掉、高层级时高界之物占多数。
 */
describe('法宝掉落 · 高界的池子该像高界', () => {
  it('池子不关门:凡层级可及的法宝,权重都大于零', () => {
    for (const tier of [1, 10, 20, 26, 32]) {
      const reachable = ARTIFACTS.filter(a => a.minTier <= tier)
      expect(reachable.length).toBeGreaterThan(0)
      for (const a of reachable) {
        expect(artifactDropWeight(a, tier), `${a.name} 在 ${tier} 阶被完全关掉了`).toBeGreaterThan(0)
      }
    }
  })

  it('同品质下,同层级的那件明显更重(约六倍)', () => {
    const near = artifactDef('af_benyuanlian')! // 混沌海 · 32 阶 · 神品
    const old = artifactDef('af_zaohua')! // 人间界 · 20 阶 · 神品
    const ratio = artifactDropWeight(near, 32) / artifactDropWeight(old, 32)
    expect(ratio, `同品质的 32 阶法宝只比 20 阶的重 ${ratio.toFixed(2)} 倍`).toBeGreaterThan(5)
    expect(ratio).toBeLessThan(7)
  })

  it('到混沌海走一趟,掉出来的大半是仙/神/混沌之物', () => {
    let high = 0
    const n = 1200
    for (let i = 0; i < n; i += 1) {
      const id = randomDropArtifact(32)
      expect(id, '32 阶抽不出任何法宝').toBeTruthy()
      if (artifactDef(id!)!.minTier >= 21) high += 1
    }
    // 实测约 0.63(改动前约 0.40)—— 阈值留足余量,免得这条统计判据自己变得时红时绿
    expect(high / n, `${n} 次里只有 ${high} 次抽到仙界以上的法宝`).toBeGreaterThan(0.55)
  })
})
