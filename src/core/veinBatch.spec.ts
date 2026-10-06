/**
 * 灵脉连投 · 批量账(无主脉版)
 * veinInvestPlan 只算不动手(点数受该脉效果上限余量与灵石共同约束),
 * investVeinBatch 按计划一口气注到位,扣费/点数与计划一致;
 * 一注都注不出(0 点计划)时绝不扣一分。
 * 六脉平级:没有主脉/副脉/总容量之说,各按自己的效果上限封顶。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { gn, mulN, sub } from '@/utils/gnum'
import { investVeinBatch, veinCap, veinInvestPlan, veinPointCost } from './veinService'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'

const BUDGET = 1e9

function seat(points: Partial<Record<'gather' | 'craft' | 'alchemy' | 'insight' | 'fortune' | 'swift', number>> = {}): void {
  usePlayerStore().major = 2 // 金丹,灵脉开放
  useDongfuStore().veinPoints = { gather: 0, craft: 0, alchemy: 0, insight: 0, fortune: 0, swift: 0, ...points }
  useResourcesStore().spiritStone = gn(BUDGET)
}

describe('灵脉连投 · 批量账', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('计划只算不动手:有上限的脉余量注满、灵石管够时点数取满、总价=点数×单价、资源分文未动', () => {
    seat()
    const cap = veinCap('craft')!
    const t = veinInvestPlan('craft')
    expect(t.points).toBe(cap)
    expect(t.stone).toEqual(mulN(veinPointCost(), cap))
    expect(t.blocked).toBeNull()
    expect(useResourcesStore().spiritStone).toEqual(gn(BUDGET))
  })

  it('无上限的脉(修炼速度)只看灵石:灵石管够时有多少买多少', () => {
    seat()
    expect(veinCap('gather')).toBeNull()
    const afford = Math.floor(Number(BUDGET) / Number(veinPointCost().m * 10 ** veinPointCost().e))
    const t = veinInvestPlan('gather')
    expect(t.points).toBeGreaterThan(0)
    expect(t.points).toBeLessThanOrEqual(afford + 1)
  })

  it('点数封顶的脉(疾风 20000):计划不超过余量,到顶报 peak', () => {
    seat({ swift: 19998 })
    expect(veinCap('swift')).toBe(20000)
    expect(veinInvestPlan('swift').points).toBe(2)
    seat({ swift: 20000 })
    expect(veinInvestPlan('swift')).toMatchObject({ points: 0, blocked: 'peak' })
  })

  it('已投的点数占掉余量:上限减已投即为可注数', () => {
    seat({ craft: 5 })
    expect(veinInvestPlan('craft').points).toBe(veinCap('craft')! - 5)
  })

  it('灵石封顶:只买得起三点的灵石,计划就只报三点', () => {
    seat()
    useResourcesStore().spiritStone = mulN(veinPointCost(), 3)
    const t = veinInvestPlan('craft')
    expect(t.points).toBe(3)
    expect(t.stone).toEqual(mulN(veinPointCost(), 3))
  })

  it('一注都注不出:该脉到效之极报 peak、灵石见底报 short', () => {
    seat({ craft: veinCap('craft')! })
    expect(veinInvestPlan('craft')).toMatchObject({ points: 0, blocked: 'peak' })
    seat()
    useResourcesStore().spiritStone = gn(0)
    expect(veinInvestPlan('craft')).toMatchObject({ points: 0, blocked: 'short' })
  })

  it('连投按计划一次注到位:点数加上、扣费与计划一致、报实际点', () => {
    seat({ craft: 10 })
    const plan = veinInvestPlan('craft')
    const n = investVeinBatch('craft')
    expect(n).toBe(plan.points)
    expect(useDongfuStore().veinPoints.craft).toBe(10 + plan.points)
    expect(useResourcesStore().spiritStone).toEqual(sub(gn(BUDGET), plan.stone))
  })

  it('一注都不成(灵石见底)时:返回 0,分文不扣、点数不动', () => {
    seat()
    useResourcesStore().spiritStone = gn(0)
    const n = investVeinBatch('craft')
    expect(n).toBe(0)
    expect(useDongfuStore().veinPoints.craft).toBe(0)
    expect(useResourcesStore().spiritStone).toEqual(gn(0))
  })
})
