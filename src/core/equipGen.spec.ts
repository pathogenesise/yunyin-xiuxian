import { describe, expect, it } from 'vitest'
import { mulberry32, RandomService } from '@/utils/random'
import { qualityDef } from '@/data/qualities'
import { AFFIX_RARITY_RANK, affixDef } from '@/data/affixes'
import { equipmentTemplate } from '@/data/equipment'
import { isZero } from '@/utils/gnum'
import { generateEquipment, resolveEquipStats, rollQuality, sortAffixLines } from './equipGen'
import type { EquipmentInstance } from '@/types'

const seeded = (seed = 42): RandomService => new RandomService(mulberry32(seed))

describe('装备生成', () => {
  it('品质下限约束生效', () => {
    const rng = seeded(1)
    for (let i = 0; i < 50; i += 1) {
      const q = rollQuality(3, rng, { minQualityRank: 3 })
      expect(q.rank).toBeGreaterThanOrEqual(3)
    }
  })

  it('高层级更容易出高品质(统计性)', () => {
    const low = seeded(7)
    const high = seeded(7)
    let lowSum = 0
    let highSum = 0
    for (let i = 0; i < 400; i += 1) {
      lowSum += rollQuality(1, low).rank
      highSum += rollQuality(18, high).rank
    }
    expect(highSum).toBeGreaterThan(lowSum)
  })

  it('词条数量符合品质区间且不重复', () => {
    const rng = seeded(99)
    for (let i = 0; i < 60; i += 1) {
      const inst = generateEquipment(8, rng)
      const q = qualityDef(inst.quality)
      expect(inst.affixes.length).toBeGreaterThanOrEqual(0)
      expect(inst.affixes.length).toBeLessThanOrEqual(q.affixes[1])
      const ids = inst.affixes.map(a => a.id)
      expect(new Set(ids).size).toBe(ids.length)
      // 词条槽位与品质门槛合法
      for (const a of inst.affixes) {
        const def = affixDef(a.id)!
        const tpl = equipmentTemplate(inst.templateId)!
        if (def.slots) expect(def.slots).toContain(tpl.slot)
        if (def.minRank !== undefined) expect(q.rank).toBeGreaterThanOrEqual(def.minRank)
      }
    }
  })

  it('指定槽位生成', () => {
    const rng = seeded(5)
    for (let i = 0; i < 20; i += 1) {
      const inst = generateEquipment(4, rng, { slot: 'weapon' })
      expect(equipmentTemplate(inst.templateId)?.slot).toBe('weapon')
    }
  })

  it('数值解析:强化提升基础属性', () => {
    const rng = seeded(11)
    const inst = generateEquipment(3, rng, { slot: 'weapon' })
    const before = resolveEquipStats(inst)
    const after = resolveEquipStats({ ...inst, level: 5 })
    expect(isZero(before.flats.attack)).toBe(false)
    expect(after.flats.attack.m * Math.pow(10, after.flats.attack.e - before.flats.attack.e)).toBeGreaterThan(before.flats.attack.m)
    expect(after.affixLines.length).toBe(inst.affixes.length)
  })

  /**
   * 词条展示序 —— 掷出的顺序是随机的,照着印等于把「哪条要紧」交给运气。
   * 判据:先稀有的(传世→常见),同稀有度先看掷得满的;一条不丢、一条不重。
   */
  it('词条按稀有度与成色排序,而不是掷出的先后', () => {
    const inst: EquipmentInstance = {
      uid: 'u-sort',
      templateId: 'w_xuantie',
      quality: 'heaven',
      tier: 6,
      level: 0,
      // 故意把常见词条放在最前、传世词条放在最后,且常见那条掷得更满
      affixes: [
        { id: 'pen1', roll: 1 }, // 稀有
        { id: 'atk2', roll: 0.2 }, // 稀有,掷得不满
        { id: 'pen3', roll: 0 } // 传世
      ]
    }
    const lines = resolveEquipStats(inst).affixLines
    expect(lines.map(l => l.id)).toEqual(['pen3', 'pen1', 'atk2'])
    for (const l of lines) expect(l.rarity).toBe(affixDef(l.id)!.rarity)
  })

  it('排序不丢不重,且稀有度确实单调不升', () => {
    const rng = seeded(2026)
    for (let i = 0; i < 60; i += 1) {
      const inst = generateEquipment(4 + (i % 12), rng, { minQualityRank: 4 })
      const lines = resolveEquipStats(inst).affixLines
      expect(new Set(lines.map(l => l.id)), '排序不该改变词条集合').toEqual(new Set(inst.affixes.map(a => a.id)))
      for (let k = 1; k < lines.length; k += 1) {
        const prev = AFFIX_RARITY_RANK[lines[k - 1]!.rarity]
        const cur = AFFIX_RARITY_RANK[lines[k]!.rarity]
        expect(prev, `第 ${k} 条比前一条更稀有,排序没生效`).toBeGreaterThanOrEqual(cur)
      }
    }
  })

  it('同稀有度按成色降序,而 sortAffixLines 不改动入参', () => {
    const rolls = [
      { id: 'atk2', roll: 0.2 },
      { id: 'def2', roll: 0.9 }
    ]
    expect(sortAffixLines(rolls).map(r => r.id)).toEqual(['def2', 'atk2'])
    expect(rolls.map(r => r.id), '排序函数不该就地改数组').toEqual(['atk2', 'def2'])
  })
})
