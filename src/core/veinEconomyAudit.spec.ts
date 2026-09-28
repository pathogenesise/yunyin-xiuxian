/* eslint-disable no-console -- Phase 30.5 灵脉与重铸经济审计 */
import { describe, expect, it } from 'vitest'
import { REFORGE_SEAL_LOAD, STONE_TIER_GROWTH, VEIN_POINT_STONE } from '@/data/constants'
import { VEINS, VEIN_EFFECT_CAPS } from '@/data/veins'
import { veinEffectText } from '@/ui/veinText'
import { veinCap } from './veinService'
import { reforgeCost } from './reforge'
import { stoneByTier } from './formulas'
import type { EquipmentInstance } from '@/types'

/**
 * Phase 30.5:灵脉投资与重铸成本经济审计
 *
 * 核心问题:
 * 1. 灵脉投资是否退化为"延迟点满"(最终全部点满→无长期决策)
 * 2. 重铸成本是否允许"无限洗完美装"(锁定核心词条→无限重铸其他→装备随机性消失)
 *
 * 审计维度:
 * - 灵脉上限设计(2026-09-27 起):四条脉平级,单条上限 = 效果硬上限 ÷ 每点效果
 * - 投点成本曲线:按层级递增,中后期资源压力测算
 * - 重铸成本递增:是否足以阻止"暴力洗完美"
 * - 资源Sink效能:灵脉+重铸能否消化后期灵石过剩
 */

describe('灵脉投资与重铸经济审计', () => {
  it('四条脉平级:有硬上限的效果按上限折算点数,没有的视作无上限', () => {
    console.log('\n—— 灵脉投资上限设计(上限 = 效果本身的极限)——')
    let capped = 0
    for (const def of VEINS) {
      const cap = veinCap(def.id)
      if (cap === null) {
        console.log(`  ${def.name}: 无硬上限,只受灵石成本约束`)
        continue
      }
      capped += 1
      console.log(`  ${def.name}: ${cap} 点即至 ${(VEIN_EFFECT_CAPS[def.capKey!] * 100).toFixed(0)}% 效果上限`)
    }
    // 修炼速度没有硬上限,其余三条各有自己的硬线
    expect(veinCap('gather')).toBeNull()
    expect(capped).toBe(3)
    // 每一处上限都真的落在效果硬线上,而不是另设的灵脉数
    for (const def of VEINS) {
      const cap = veinCap(def.id)
      if (cap === null) continue
      const per = def.id === 'insight' ? 0.004 : (Object.values(def.perPoint)[0] as number)
      expect(cap * per, `${def.name} 到顶时应正好落在硬线上`).toBeCloseTo(VEIN_EFFECT_CAPS[def.capKey!], 10)
      expect(cap * per).toBeLessThanOrEqual(VEIN_EFFECT_CAPS[def.capKey!])
    }
  })

  it('灵脉四脉定义:各脉增益明确,形成不同流派偏好', () => {
    console.log('\n  灵脉定义:')
    for (const def of VEINS) {
      const cap = veinCap(def.id)
      console.log(`    ${def.name}(${def.id}): ${def.desc}`)
      console.log(`      投满效果: ${veinEffectText(def, cap ?? 100)}`)
    }

    // 验证四脉增益互不相同(perPoint 不同)
    for (let i = 0; i < VEINS.length; i += 1) {
      for (let j = i + 1; j < VEINS.length; j += 1) {
        const a = VEINS[i]!
        const b = VEINS[j]!
        const diff = JSON.stringify(a.perPoint) !== JSON.stringify(b.perPoint)
        expect(diff, `${a.name} 与 ${b.name} 增益应有差异`).toBe(true)
      }
    }
  })

  it('投点成本曲线:按层级递增,中后期形成资源压力', () => {
    console.log('\n  单点投资成本(按层级):')
    const tiers = [
      { name: '练气', tier: 1 },
      { name: '筑基', tier: 2 },
      { name: '金丹', tier: 3 },
      { name: '元婴', tier: 4 },
      { name: '化神', tier: 5 }
    ]

    const costs: Array<{ tier: number; cost: { m: number; e: number } }> = []
    for (const { name, tier } of tiers) {
      const cost = stoneByTier(tier, VEIN_POINT_STONE)
      costs.push({ tier, cost })
      console.log(`    ${name}(T${tier}): ${cost.m.toFixed(2)}e${cost.e} 灵石/点`)
    }

    // 验证成本递增
    for (let i = 1; i < costs.length; i += 1) {
      const prev = costs[i - 1]!
      const curr = costs[i]!
      const prevVal = prev.cost.m * Math.pow(10, prev.cost.e)
      const currVal = curr.cost.m * Math.pow(10, curr.cost.e)
      expect(currVal, `T${curr.tier} 成本应大于 T${prev.tier}`).toBeGreaterThan(prevVal)
    }

    // 投满一条有上限的脉的总成本(以金丹为例,灵脉解锁层级)
    const jindan = costs.find(c => c.tier === 3)!
    const fullCost = { m: jindan.cost.m * veinCap('alchemy')!, e: jindan.cost.e }
    console.log(`\n  投满玉髓灵脉总成本(金丹): ${fullCost.m.toFixed(2)}e${fullCost.e} 灵石`)
    expect(fullCost.m, '投满一条脉应是显著投资').toBeGreaterThan(50)
  })

  it('投入策略模拟:修炼速度可长期投,三条有上限的脉各自封顶', () => {
    console.log('\n  灵脉投资策略模拟:')
    const strategies = [
      { name: '专精修炼', points: { gather: 500, craft: 0, alchemy: 0, insight: 0 } },
      { name: '均衡到顶', points: { gather: 200, craft: veinCap('craft')!, alchemy: veinCap('alchemy')!, insight: veinCap('insight')! } },
      { name: '主攻炼器', points: { gather: 0, craft: veinCap('craft')!, alchemy: 0, insight: 0 } }
    ]
    for (const s of strategies) {
      const total = Object.values(s.points).reduce((a, b) => a + b, 0)
      console.log(`    ${s.name}: ${JSON.stringify(s.points)} = ${total} 点`)
    }
    console.log('\n  关键约束:')
    console.log('    - 四条脉平级,没有主脉/副脉之分,也不设总容量上限')
    console.log('    - 某脉到顶后再投不增数值,故被上限挡住')
    // 三条有上限的脉各自封顶,修炼速度那条没有硬上限、可长期投
    expect(strategies[1]!.points.gather).toBeGreaterThan(veinCap('insight')!)
    expect(strategies[0]!.points.gather).toBeGreaterThan(veinCap('insight')!)
  })
})

describe('Phase 30.5:装备重铸成本审计(机制已实现,行为验证)', () => {
  const base: EquipmentInstance = {
    uid: 'u1',
    templateId: 'w_zhuqing',
    quality: 'mortal',
    tier: 3,
    level: 0,
    affixes: [
      { id: 'atk1', roll: 0.5 },
      { id: 'def1', roll: 0.5 }
    ],
    reforgeCount: 0
  }
  const stoneOf = (c: { m: number; e: number }): number => c.m * Math.pow(10, c.e)

  /**
   * 重铸成本在 36 轮改过一次口径:旧版是「品质倍率 × 1.5^次数,上限 10 次」,
   * 现在只与**阶数**与**锁定数**挂钩、且不限次数(见 data/constants 的注释)。
   * 于是这里的判据也跟着换:不再验"越洗越贵",而是验"成本只看那两件事、且洗不封顶"。
   */
  it('品质与重铸成本无关:同一件洗到第几次、什么品质,都是同一个价', () => {
    const c0 = reforgeCost({ ...base, reforgeCount: 0, quality: 'mortal' })!
    const c99 = reforgeCost({ ...base, reforgeCount: 99, quality: 'divine' })!
    expect(stoneOf(c99.stone)).toBeCloseTo(stoneOf(c0.stone), 6)
    expect(c99.dust).toBe(c0.dust)
  })

  it('不限次数:洗到第两百次仍可重铸(次数只作记录,不进公式)', () => {
    expect(reforgeCost({ ...base, reforgeCount: 200 }), '不该再有次数上限').not.toBeNull()
  })

  it('成本随锁定数线性上浮:每锁定一条 +REFORGE_SEAL_LOAD', () => {
    const one = reforgeCost({ ...base, affixes: [...base.affixes, { id: 'hp1', roll: 0.5 }], sealedAffixIds: ['atk1'] })!
    const two = reforgeCost({
      ...base,
      affixes: [...base.affixes, { id: 'hp1', roll: 0.5 }],
      sealedAffixIds: ['atk1', 'def1']
    })!
    expect(stoneOf(two.stone) / stoneOf(one.stone)).toBeCloseTo(
      (1 + 2 * REFORGE_SEAL_LOAD) / (1 + REFORGE_SEAL_LOAD),
      6
    )
  })

  it('层阶越高,重铸越贵(与掉落同轴 stoneByTier)', () => {
    const t3 = reforgeCost({ ...base, tier: 3 })!
    const t10 = reforgeCost({ ...base, tier: 10 })!
    expect(stoneOf(t10.stone) / stoneOf(t3.stone)).toBeCloseTo(Math.pow(STONE_TIER_GROWTH, 7), 4)
  })

  it('「暴力洗完美」的刹车换到了别处:高阶层 + 锁定溢价,而不是次数', () => {
    // 同一件锁了三条的 20 阶装备,单次重铸要比 3 阶未锁定的贵出几个数量级 ——
    // 玩家想一直洗下去,付的是"这件有多高阶、我保住了几条"的钱
    const cheap = stoneOf(reforgeCost({ ...base, tier: 3 })!.stone)
    const dear = stoneOf(
      reforgeCost({
        ...base,
        tier: 20,
        affixes: [...base.affixes, { id: 'hp1', roll: 0.5 }, { id: 'crit1', roll: 0.5 }, { id: 'luck1', roll: 0.5 }],
        sealedAffixIds: ['atk1', 'def1', 'hp1']
      })!.stone
    )
    console.log(`\n  3 阶未锁定 ${cheap.toExponential(2)} → 20 阶锁定三条 ${dear.toExponential(2)}(×${(dear / cheap).toFixed(0)})`)
    expect(dear / cheap).toBeGreaterThan(1000)
  })
})

describe('Phase 30.5:灵石 Sink 渠道', () => {
  it('灵脉投资与装备重铸都是真实的灵石去向(不再有待实现项)', () => {
    const veinFull = stoneByTier(3, VEIN_POINT_STONE).m * Math.pow(10, stoneByTier(3, VEIN_POINT_STONE).e) * veinCap('alchemy')!
    const eq: EquipmentInstance = {
      uid: 'u2',
      templateId: 'w_zhuqing',
      quality: 'excellent',
      tier: 3,
      level: 0,
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 }
      ],
      reforgeCount: 9
    }
    const reforge = reforgeCost(eq)!
    const reforgeStone = reforge.stone.m * Math.pow(10, reforge.stone.e)
    console.log(`\n  投满玉髓灵脉(金丹)≈ ${veinFull.toExponential(2)} 灵石;重铸一次(金丹精品)≈ ${reforgeStone.toExponential(2)} 灵石`)
    expect(veinFull).toBeGreaterThan(0)
    expect(reforgeStone).toBeGreaterThan(0)
  })
})
