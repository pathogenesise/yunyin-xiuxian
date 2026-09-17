import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDongfuStore } from './dongfu'
import { BUILDINGS } from '@/data/buildings'
import { FORGE_LEVEL_PER_CAP } from '@/data/constants'
import type { BuildingId } from '@/types'

describe('dongfu store · sanitize', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('损坏的等级收敛回 0', () => {
    const dongfu = useDongfuStore()
    const corrupted = { ...dongfu.levels, mansion: NaN, alchemy: -3 } as Record<BuildingId, number>
    dongfu.levels = corrupted
    dongfu.sanitize()
    expect(dongfu.levels.mansion).toBe(0)
    expect(dongfu.levels.alchemy).toBe(0)
    // 修复后离线封顶小时恢复合法值,不再 NaN
    expect(dongfu.offlineCapHours).toBeGreaterThan(0)
    expect(Number.isFinite(dongfu.offlineCapHours)).toBe(true)
  })

  it('炼器台每 FORGE_LEVEL_PER_CAP 级提升强化上限 1(常数真的接线,不是写死的 2)', () => {
    const dongfu = useDongfuStore()
    dongfu.setLevel('forge', FORGE_LEVEL_PER_CAP * 3)
    expect(dongfu.forgeCapBonus).toBe(3)
    dongfu.setLevel('forge', FORGE_LEVEL_PER_CAP * 3 + 1)
    expect(dongfu.forgeCapBonus).toBe(3) // 未满一档
  })

  it('越界的等级钳到建筑上限', () => {
    const dongfu = useDongfuStore()
    const mansion = BUILDINGS.find(b => b.id === 'mansion')!
    dongfu.levels = { ...dongfu.levels, mansion: mansion.maxLevel + 99 }
    dongfu.sanitize()
    expect(dongfu.levels.mansion).toBe(mansion.maxLevel)
  })

  it('非法产出小数与灵脉点数归零', () => {
    const dongfu = useDongfuStore()
    dongfu.frac = { herb: NaN, ore: Infinity, wudao: 3 }
    dongfu.veinPoints = { gather: NaN, craft: -2, alchemy: 5, insight: 0 }
    dongfu.sanitize()
    expect(dongfu.frac.herb).toBe(0)
    expect(dongfu.frac.ore).toBe(0)
    expect(dongfu.frac.wudao).toBe(3)
    expect(dongfu.veinPoints.gather).toBe(0)
    expect(dongfu.veinPoints.craft).toBe(0)
    expect(dongfu.veinPoints.alchemy).toBe(5)
  })
})

describe('dongfu store · buildingCap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('洞府低级时是全局闸门在管:灵兽园品类 8 也被压在 5', () => {
    const dongfu = useDongfuStore() // mansion 0 -> buildingLevelCap 5
    const beast = BUILDINGS.find(b => b.id === 'beast')!
    expect(dongfu.buildingCap('beast')).toBe(Math.min(beast.maxLevel, 5))
  })

  it('洞府提级后上限上浮,直到自身品类上限接管', () => {
    const dongfu = useDongfuStore()
    dongfu.levels = { ...dongfu.levels, mansion: 1 } // cap 10
    // 灵兽园品类 8 < 10,仍是品类在管
    expect(dongfu.buildingCap('beast')).toBe(8)
    // 藏经阁品类 12 > 10,此时洞府闸门在管
    const library = BUILDINGS.find(b => b.id === 'library')!
    expect(dongfu.buildingCap('library')).toBe(Math.min(library.maxLevel, 10))
  })

  it('洞府满级 25 永不成为其余建筑的瓶颈:各建筑品类上限更低', () => {
    const dongfu = useDongfuStore()
    dongfu.levels = { ...dongfu.levels, mansion: 4 } // cap 25
    for (const def of BUILDINGS) {
      if (def.id === 'mansion') continue
      expect(dongfu.buildingCap(def.id)).toBe(def.maxLevel)
      expect(def.maxLevel).toBeLessThan(25) // 品类上限都在 25 之下
    }
  })

  it('洞府自身只受品类上限约束,不被自己闸门卡住', () => {
    const dongfu = useDongfuStore()
    const mansion = BUILDINGS.find(b => b.id === 'mansion')!
    expect(dongfu.buildingCap('mansion')).toBe(mansion.maxLevel)
  })
})

/**
 * 比率体检:洞府产出对**等级**必须是线性的(与镇压对时长的线性同一条尺子)。
 * 只看"有没有产出"看不出某处被 clamp 或按整点取整 —— 三级灵田的余数
 * 应当恰是一级的三倍。
 */
describe('洞府产出 · 等级线性', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const fracAfter = (level: number, seconds: number): { herb: number; ore: number; wudao: number } => {
    setActivePinia(createPinia())
    const dongfu = useDongfuStore()
    dongfu.levels.field = level
    dongfu.levels.library = level
    dongfu.produce(seconds)
    return { herb: dongfu.frac.herb, ore: dongfu.frac.ore, wudao: dongfu.frac.wudao }
  }

  it('三级灵田/藏经阁的产出恰是一级的三倍(取整前看余数,避免被 floor 掩盖)', () => {
    /**
     * 时长要短到"一份整产出都不满":produce 每次调用都会把整数量 floor 进资源,
     * 一旦某条产线凑够 1,余数就不再与总量成比例(实测 1332 秒时铁矿余数比只剩 0.75)。
     * 120 秒下三条产线都不到 1,frac 就是总量本身,比值才干净。
     */
    const seconds = 120
    const one = fracAfter(1, seconds)
    const three = fracAfter(3, seconds)
    expect(one.herb).toBeGreaterThan(0)
    expect(three.herb / one.herb).toBeCloseTo(3, 6)
    expect(three.ore / one.ore).toBeCloseTo(3, 6)
    expect(three.wudao / one.wudao).toBeCloseTo(3, 6)
  })

  it('零级不产出(升级是唯一来源,没有兜底白送)', () => {
    const zero = fracAfter(0, 3600)
    expect(zero.herb).toBe(0)
    expect(zero.ore).toBe(0)
    expect(zero.wudao).toBe(0)
  })
})
