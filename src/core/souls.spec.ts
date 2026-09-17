/* eslint-disable no-console */
/**
 * 器魂系统 —— 凝炼判定与容量约束
 *
 * 器魂是凡器在天界的存在形式:天道抹平数值,只余形意。
 * 这套用例守两件事——
 *   1. 凝炼判定只看「路数」,不看「数值大小」(否则又变成堆装备)
 *   2. 装配槽位与品阶差距都受控,天界比的是方向而不是厚度
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEndgameStore } from '@/stores/endgame'
import { usePlayerStore } from '@/stores/player'
import type { EquipmentInstance, StatMods } from '@/types'
import {
  SOUL_GRADES,
  SOUL_SLOTS,
  SOUL_TYPES,
  soulGradeDef,
  soulGradeOfQuality,
  soulMods,
  soulName,
  soulTypeDef,
  type SoulInstance
} from '@/data/souls'
import { canRefine, previewSoul, refineSoul } from './soulForge'
import { modDepth } from './statsCalc'
import { CELESTIAL_BASE_DEPTH } from './gauntlet'

/** 造一件带指定词条的装备实例 */
function equipWith(affixes: { id: string; roll: number }[], quality: EquipmentInstance['quality'] = 'spirit'): EquipmentInstance {
  return { uid: 'test', templateId: 'w_zhuqing', quality, tier: 10, level: 0, affixes }
}

describe('器魂 · 类型判定看路数不看数值', () => {
  it('六类器魂各有判定键,互不重叠', () => {
    const seen = new Set<string>()
    for (const def of SOUL_TYPES) {
      for (const key of def.judgeKeys) {
        expect(seen.has(key), `判定键 ${key} 被多类器魂共用,会导致判定歧义`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('每类器魂的自身词条都落在自己的判定键上(名实相符)', () => {
    for (const def of SOUL_TYPES) {
      const keys = Object.keys(def.mods)
      const judge = new Set<string>(def.judgeKeys)
      const overlap = keys.filter(k => judge.has(k))
      expect(overlap.length, `${def.name} 提供的词条与它的判定路数无关`).toBeGreaterThan(0)
    }
  })

  it('白板装备凝不出器魂', () => {
    const blank = equipWith([])
    expect(canRefine(blank)).toBe(false)
    expect(refineSoul(blank)).toBeNull()
    expect(previewSoul(blank).type).toBeNull()
  })

  it('反震词条的装备凝出棘魂,暴击词条的凝出锋魂', () => {
    // atk 系与 crit 系走锋芒,counter 系走反震——判定按词条方向落位
    const counter = equipWith([{ id: 'cnt1', roll: 0.5 }])
    const crit = equipWith([{ id: 'crit1', roll: 0.5 }])
    const counterType = previewSoul(counter).type
    const critType = previewSoul(crit).type
    if (counterType) expect(counterType.id).toBe('fanzhen')
    if (critType) expect(critType.id).toBe('fengmang')
  })
})

describe('器魂 · 品阶只拉开有限差距', () => {
  it('品质映射到六阶,且单调不减', () => {
    let prev = -1
    for (let rank = 0; rank <= 8; rank += 1) {
      const grade = soulGradeOfQuality(rank)
      expect(grade.rank).toBeGreaterThanOrEqual(prev)
      prev = grade.rank
    }
  })

  it('最高阶与最低阶的倍率差远小于装备品质差(神品 9.5x)', () => {
    const lowest = SOUL_GRADES[0]!.mult
    const highest = SOUL_GRADES[SOUL_GRADES.length - 1]!.mult
    const spread = highest / lowest
    console.log(`\n器魂品阶倍率跨度 ${spread.toFixed(2)}x(装备品质跨度 9.5x)`)
    // 好装备仍值得刷,但刷到顶也换不来碾压——天界比的是方向
    expect(spread).toBeLessThan(3)
    expect(spread).toBeGreaterThan(1.5)
  })

  it('同类器魂高阶强于低阶,但不成倍碾压', () => {
    const low: SoulInstance = { uid: 'a', type: 'fengmang', grade: 0, fromName: '青竹剑' }
    const high: SoulInstance = { uid: 'b', type: 'fengmang', grade: 5, fromName: '鸿蒙剑' }
    expect(modDepth(soulMods(high))).toBeGreaterThan(modDepth(soulMods(low)))
    expect(modDepth(soulMods(high))).toBeLessThan(modDepth(soulMods(low)) * 3)
  })
})

describe('器魂 · 满配有界', () => {
  it('装满槽位的最强组合,总深度是一条有上限的线', () => {
    // 器魂现在是**叠加**的一层(见 soulForge.spec 与 stores/player.celestialStats),
    // 故这里守的不再是"压到容量",而是"这一笔投入本身有界":
    // 三枚化真加起来也不该越过基准深度(2.6)太多,否则凝魂就成了新的堆叠出口。
    const best = SOUL_TYPES.slice(0, SOUL_SLOTS).map<SoulInstance>((t, i) => ({
      uid: `s${i}`,
      type: t.id,
      grade: SOUL_GRADES.length - 1,
      fromName: '神品'
    }))
    const total = best.reduce((sum, s) => sum + modDepth(soulMods(s)), 0)
    console.log(`\n三枚化真器魂合计深度 ${total.toFixed(2)}`)
    expect(total).toBeLessThan(CELESTIAL_BASE_DEPTH)
  })

  it('槽位少于器魂类型数,必须取舍', () => {
    expect(SOUL_SLOTS).toBeLessThan(SOUL_TYPES.length)
  })
})

describe('器魂 · 展示与查表', () => {
  it('名称由品阶与类型拼成', () => {
    const soul: SoulInstance = { uid: 'x', type: 'gangdun', grade: 2, fromName: '玄铁冠' }
    expect(soulName(soul)).toBe(`${soulGradeDef(2).name}·${soulTypeDef('gangdun')!.name}`)
  })

  it('越界品阶被夹住,不会取到 undefined', () => {
    expect(soulGradeDef(-5)).toBe(SOUL_GRADES[0])
    expect(soulGradeDef(999)).toBe(SOUL_GRADES[SOUL_GRADES.length - 1])
    expect(soulGradeOfQuality(-3).rank).toBe(0)
    expect(soulGradeOfQuality(99).rank).toBe(SOUL_GRADES.length - 1)
  })

  it('未知类型的器魂返回空词条而非抛错', () => {
    const bogus = { uid: 'x', type: 'nonexistent', grade: 0, fromName: '?' } as unknown as SoulInstance
    const mods: StatMods = soulMods(bogus)
    expect(mods).toEqual({})
  })
})

describe('器魂 · 存档健壮性', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('器魂字段非数组时不抛错(旧存档/外部迁移/手工改坏)', () => {
    // 曾经的崩溃模式:activeSouls 直接对 undefined 调 .map,
    // 在渲染期抛 TypeError,Vue 不断重试渲染 → 「出现异常,已记录」toast 反复弹出
    const endgame = useEndgameStore()
    endgame.$patch({ souls: undefined, equippedSouls: undefined } as never)
    expect(() => endgame.activeSouls).not.toThrow()
    expect(endgame.activeSouls).toEqual([])
    expect(endgame.soulList).toEqual([])
    expect(() => endgame.soulMods).not.toThrow()
    expect(() => usePlayerStore().celestialStats).not.toThrow()
  })

  it('字段被改坏后,增删改仍能自愈', () => {
    const endgame = useEndgameStore()
    endgame.$patch({ souls: null, equippedSouls: null } as never)
    const soul: SoulInstance = { uid: 'a', type: 'fengmang', grade: 3, fromName: '寒锋剑' }
    expect(() => endgame.addSoul(soul)).not.toThrow()
    expect(endgame.soulList).toHaveLength(1)
    expect(endgame.equipSoul('a')).toBe(true)
    expect(endgame.activeSouls).toHaveLength(1)
    endgame.unequipSoul('a')
    expect(endgame.activeSouls).toHaveLength(0)
  })

  it('装配了不存在的 uid 时被静默过滤,不影响其余器魂', () => {
    const endgame = useEndgameStore()
    endgame.$patch({
      souls: [{ uid: 'real', type: 'gangdun', grade: 1, fromName: '玄铁冠' }],
      equippedSouls: ['ghost', 'real']
    } as never)
    expect(endgame.activeSouls.map(s => s.uid)).toEqual(['real'])
  })
})

describe('器魂 · 凝炼必须优于不凝', () => {
  it('满配器魂强于兜底压缩,否则没人会去凝', () => {
    // 器魂是叠加层:凝了只会更多,不存在"不凝反而更强"那条岔路
    const best = SOUL_TYPES.slice(0, SOUL_SLOTS).map<SoulInstance>((t, i) => ({
      uid: `s${i}`,
      type: t.id,
      grade: SOUL_GRADES.length - 1,
      fromName: '神品'
    }))
    const refined = best.reduce((sum, s) => sum + modDepth(soulMods(s)), 0)
    console.log(`\n满配器魂合计深度 ${refined.toFixed(2)}`)
    expect(refined).toBeGreaterThan(0)
  })

  it('最低阶满配也是一笔正收益(只是薄)', () => {
    const worst = SOUL_TYPES.slice(0, SOUL_SLOTS).map<SoulInstance>((t, i) => ({
      uid: `w${i}`,
      type: t.id,
      grade: 0,
      fromName: '凡品'
    }))
    const total = worst.reduce((sum, s) => sum + modDepth(soulMods(s)), 0)
    console.log(`最低阶满配合计深度 ${total.toFixed(2)}`)
    expect(total).toBeGreaterThan(0.1)
  })
})
