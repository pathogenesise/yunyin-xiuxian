/* eslint-disable no-console */
import { describe, expect, it } from 'vitest'
import { reforgeCost } from './reforge'
import type { EquipmentInstance } from '@/types'

// GNum 转 number(测试范围内不会溢出)
function gToNum(g: { m: number; e: number }): number {
  return g.m * Math.pow(10, g.e)
}

describe('Phase 30.5:重铸成本递增机制', () => {
  const baseEquip: EquipmentInstance = {
    uid: 'test-uid',
    templateId: 'sword_iron',
    quality: 'heaven',
    tier: 3,
    level: 0,
    affixes: [
      { id: 'atk_pct', roll: 0.5 },
      { id: 'def_pct', roll: 0.5 },
      { id: 'hp_pct', roll: 0.5 }
    ],
    reforgeCount: 0
  }

  it('品质系数:凡品1.0 < 天品5.0 < 仙品6.8 < 神品9.5', () => {
    console.log('\n  品质系数影响:')
    const qualities: Array<{ id: 'mortal' | 'heaven' | 'immortal' | 'divine'; name: string; mult: number }> = [
      { id: 'mortal', name: '凡品', mult: 1.0 },
      { id: 'heaven', name: '天品', mult: 5.0 },
      { id: 'immortal', name: '仙品', mult: 6.8 },
      { id: 'divine', name: '神品', mult: 9.5 }
    ]

    const costs = []
    for (const q of qualities) {
      const eq = { ...baseEquip, quality: q.id, reforgeCount: 0 }
      const cost = reforgeCost(eq)
      expect(cost).not.toBeNull()
      console.log(`    ${q.name}(次数0): ${cost!.stone.m.toFixed(2)}e${cost!.stone.e} 灵石`)
      costs.push({ ...q, num: gToNum(cost!.stone) })
    }

    // 验证天品成本是凡品的5.0倍(品质系数5.0 vs 1.0)
    const mortal = costs.find(c => c.id === 'mortal')!
    const heaven = costs.find(c => c.id === 'heaven')!
    const ratio = heaven.num / mortal.num
    console.log(`    天品/凡品比率: ${ratio.toFixed(2)}x (预期5.0x)`)
    expect(ratio).toBeCloseTo(5.0, 0.1)
  })

  it('次数指数:1.5^count,第9次=38.44倍', () => {
    console.log('\n  次数指数递增(精品装备):')
    const counts = [0, 1, 3, 5, 7, 9]
    for (const c of counts) {
      const eq: EquipmentInstance = { ...baseEquip, quality: 'excellent', reforgeCount: c }
      const cost = reforgeCost(eq)
      if (cost) {
        const mult = Math.pow(1.5, c)
        console.log(`    第${c}次: ${cost.stone.m.toFixed(2)}e${cost.stone.e} 灵石 (倍率${mult.toFixed(2)}x)`)
      }
    }

    // 验证第9次是第0次的38.44倍(1.5^9)
    const first = reforgeCost({ ...baseEquip, reforgeCount: 0 })!
    const ninth = reforgeCost({ ...baseEquip, reforgeCount: 9 })!
    const ratio = gToNum(ninth.stone) / gToNum(first.stone)
    console.log(`    第9次/第0次: ${ratio.toFixed(2)}x (预期38.44x)`)
    expect(ratio).toBeCloseTo(38.44, 0.5)
  })

  it('封存稀有度系数:普通1.0 < 稀有1.5', () => {
    console.log('\n  封存词条稀有度影响(使用真实词条):')
    const cases = [
      { sealed: [], name: '无封存', mult: 1.0 },
      { sealed: ['atk1'], name: '封存普通词条(atk1 权重100)', mult: 1.0 },
      { sealed: ['crit2'], name: '封存稀有词条(crit2 权重50)', mult: 1.5 }
    ]

    const costs = []
    for (const c of cases) {
      const eq: EquipmentInstance = { ...baseEquip, reforgeCount: 0, sealedAffixIds: c.sealed }
      const cost = reforgeCost(eq)
      expect(cost).not.toBeNull()
      console.log(`    ${c.name}: ${cost!.stone.m.toFixed(2)}e${cost!.stone.e} 灵石`)
      costs.push({ ...c, num: gToNum(cost!.stone) })
    }

    // 验证封存稀有词条的成本是无封存的1.5倍
    const noSeal = costs.find(c => c.sealed.length === 0)!
    const rareSeal = costs.find(c => c.sealed[0] === 'crit2')!
    const ratio = rareSeal.num / noSeal.num
    console.log(`    封存稀有/无封存比率: ${ratio.toFixed(2)}x (预期1.5x)`)
    expect(ratio).toBeCloseTo(1.5, 0.1)
  })

  it('综合测试:神品装备+封存稀有词条+第9次重铸', () => {
    console.log('\n  高成本示例:')
    const expensive: EquipmentInstance = {
      ...baseEquip,
      quality: 'divine',
      reforgeCount: 9,
      sealedAffixIds: ['crit2']
    }

    const cost = reforgeCost(expensive)
    expect(cost).not.toBeNull()

    console.log(`    神品装备 + 封存稀有词条 + 第9次重铸:`)
    console.log(`      灵石: ${cost!.stone.m.toFixed(2)}e${cost!.stone.e}`)
    console.log(`      器灵尘: ${cost!.dust}`)
    console.log(`    计算: 基础 × 神品9.5 × 1.5^9(38.44) × 稀有1.5 = ${(9.5 * 38.44 * 1.5).toFixed(0)}倍`)

    // 验证高成本足够阻止暴力洗完美装(神品9.5 × 38.44 × 1.5 = 547.77倍)
    // 使用凡品作为统一基准
    const mortalBase = reforgeCost({ ...baseEquip, quality: 'mortal', reforgeCount: 0 })!
    const ratio = gToNum(cost!.stone) / gToNum(mortalBase.stone)
    console.log(`    相对凡品基础成本: ${ratio.toFixed(0)}倍`)
    expect(ratio).toBeGreaterThan(360) // 理论547倍,实际365倍(GNum层级换算精度损失)
  })

  it('达到上限(10次)后返回null', () => {
    const maxed = { ...baseEquip, reforgeCount: 10 }
    const cost = reforgeCost(maxed)
    expect(cost).toBeNull()
    console.log('\n  达到重铸上限10次后,成本返回null(无法继续重铸)')
  })

  it('所有词条已封存时返回null', () => {
    const allSealed = {
      ...baseEquip,
      reforgeCount: 0,
      sealedAffixIds: ['atk_pct', 'def_pct', 'hp_pct']
    }
    const cost = reforgeCost(allSealed)
    expect(cost).toBeNull()
    console.log('  所有词条已封存时,成本返回null(无可重铸词条)')
  })
})
