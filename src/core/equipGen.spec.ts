import { describe, expect, it } from 'vitest'
import { mulberry32, RandomService } from '@/utils/random'
import { qualityDef } from '@/data/qualities'
import { affixDef } from '@/data/affixes'
import { equipmentTemplate } from '@/data/equipment'
import { isZero } from '@/utils/gnum'
import { generateEquipment, resolveEquipStats, rollQuality } from './equipGen'

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
})
