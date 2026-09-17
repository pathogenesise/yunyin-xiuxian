/**
 * Phase 31.0 S5:装备共鸣 —— 机制组合而非数值堆叠
 */
import { describe, it, expect } from 'vitest'
import { activeSets, setCounts, hasActiveSet, equipSetDef } from './equipSet'
import { EQUIPMENT_TEMPLATES } from '@/data/equipment'
import type { EquipmentInstance, QualityId } from '@/types'

function inst(uid: string, templateId: string): EquipmentInstance {
  return { uid, templateId, quality: 'fine' as QualityId, tier: 3, level: 0, affixes: [] }
}

describe('装备共鸣(equipSet)', () => {
  it('组定义完整:铁壁/星斗,含机制钩子', () => {
    expect(equipSetDef('s_tiebi')?.hook).toBe('ironwall')
    expect(equipSetDef('s_xingdou')?.hook).toBe('astral')
  })

  it('同 set 两件触发共鸣,单件不触发', () => {
    const one = [inst('a', 'w_xuantie')]
    expect(activeSets(one).length).toBe(0)
    const two = [inst('a', 'w_xuantie'), inst('b', 'h_xuantie')]
    const sets = activeSets(two)
    expect(sets.length).toBe(1)
    expect(sets[0]!.id).toBe('s_tiebi')
    expect(hasActiveSet(two, 'ironwall')).toBe(true)
  })

  it('不同 set 互不干扰,各自计件', () => {
    const mixed = [inst('a', 'w_xuantie'), inst('b', 'h_xuantie'), inst('c', 'h_xingchen'), inst('d', 'b_xingluo')]
    const sets = activeSets(mixed)
    expect(sets.length).toBe(2)
  })

  it('已装备统计正确(未装备的不计)', () => {
    const counts = setCounts([inst('a', 'w_xuantie'), inst('b', 'b_xuanwu')])
    expect(counts.get('s_tiebi')).toBe(2)
  })

  it('每件带 set 的装备都指向一个真实存在的共鸣定义', () => {
    // 扩界新增的仙甲/神铠/混沌套件若忘了登记,共鸣会静默失效——
    // 界面上写着"套装",打起来却什么也不发生,正是最难被发现的暗伤
    for (const t of EQUIPMENT_TEMPLATES) {
      if (!t.set) continue
      const def = equipSetDef(t.set)
      expect(def, `${t.name}(${t.id}) 引用了不存在的共鸣 ${t.set}`).toBeDefined()
      expect(def!.effectDesc.length).toBeGreaterThan(0)
    }
  })

  it('每个共鸣都有足够多的部件可以真的触发(不能是凑不齐的空套)', () => {
    const pieces = new Map<string, number>()
    for (const t of EQUIPMENT_TEMPLATES) {
      if (!t.set) continue
      pieces.set(t.set, (pieces.get(t.set) ?? 0) + 1)
    }
    for (const [setId, n] of pieces) {
      const def = equipSetDef(setId)!
      expect(n, `${def.name} 只有 ${n} 件,达不到触发所需的 ${def.required} 件`).toBeGreaterThanOrEqual(def.required)
    }
  })
})
