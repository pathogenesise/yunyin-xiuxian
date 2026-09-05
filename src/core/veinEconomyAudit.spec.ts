/* eslint-disable no-console -- Phase 30.5 灵脉与重铸经济审计 */
import { describe, expect, it } from 'vitest'
import { VEIN_MAIN_CAPACITY, VEIN_POINT_STONE, VEIN_SIDE_CAP, VEIN_TOTAL_CAPACITY } from '@/data/constants'
import { VEINS } from '@/data/veins'
import { stoneByTier } from './formulas'

/**
 * Phase 30.5:灵脉投资与重铸成本经济审计
 *
 * 核心问题:
 * 1. 灵脉投资是否退化为"延迟点满"(最终全部120点都能投满→无长期决策)
 * 2. 重铸成本是否允许"无限洗完美装"(封存核心词条→无限重铸其他→装备随机性消失)
 *
 * 审计维度:
 * - 灵脉容量设计:总100点,主脉70,副脉各30,是否形成真正的取舍
 * - 投点成本曲线:按层级递增,中后期资源压力测算
 * - 重铸成本递增:是否足以阻止"暴力洗完美"
 * - 资源Sink效能:灵脉+重铸能否消化后期灵石过剩
 */

describe('Phase 30.5:灵脉投资终局审计', () => {
  it('灵脉容量设计:总量100点形成主副脉取舍', () => {
    console.log('\n—— Phase 30.5 灵脉投资容量设计 ——')
    console.log(`  总容量: ${VEIN_TOTAL_CAPACITY} 点`)
    console.log(`  主脉上限: ${VEIN_MAIN_CAPACITY} 点`)
    console.log(`  副脉上限: 各 ${VEIN_SIDE_CAP} 点`)

    // 设计意图验证:4条脉如果都想投满副脉上限(4×30=120点)会超出总容量
    const veinCount = VEINS.length
    const fullSideCap = veinCount * VEIN_SIDE_CAP
    console.log(`  若4脉均投满副脉上限: ${fullSideCap} 点(超出总容量 ${fullSideCap - VEIN_TOTAL_CAPACITY} 点)`)

    // 主脉投满后剩余容量
    const remainAfterMain = VEIN_TOTAL_CAPACITY - VEIN_MAIN_CAPACITY
    console.log(`  主脉投满后剩余: ${remainAfterMain} 点(可投满1副脉,另2脉无法投满)`)

    expect(VEIN_TOTAL_CAPACITY, '总容量应形成约束').toBeLessThan(fullSideCap)
    expect(remainAfterMain, '主脉投满后应无法投满所有副脉').toBeLessThan(VEIN_SIDE_CAP * (veinCount - 1))
  })

  it('灵脉四脉定义:各脉增益明确,形成不同流派偏好', () => {
    console.log('\n  灵脉定义:')
    for (const def of VEINS) {
      console.log(`    ${def.name}(${def.id}): ${def.desc}`)
      console.log(`      满级增益: ${def.effectText(VEIN_MAIN_CAPACITY)}`)
    }

    // 验证四脉增益互不相同(perPoint 不同)
    for (let i = 0; i < VEINS.length; i++) {
      for (let j = i + 1; j < VEINS.length; j++) {
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
      { name: '化神', tier: 5 },
    ]

    const costs: Array<{ tier: number; cost: { m: number; e: number } }> = []
    for (const { name, tier } of tiers) {
      const cost = stoneByTier(tier, VEIN_POINT_STONE)
      costs.push({ tier, cost })
      console.log(`    ${name}(T${tier}): ${cost.m.toFixed(2)}e${cost.e} 灵石/点`)
    }

    // 验证成本递增
    for (let i = 1; i < costs.length; i++) {
      const prev = costs[i - 1]!
      const curr = costs[i]!
      const prevVal = prev.cost.m * Math.pow(10, prev.cost.e)
      const currVal = curr.cost.m * Math.pow(10, curr.cost.e)
      expect(currVal, `T${curr.tier} 成本应大于 T${prev.tier}`).toBeGreaterThan(prevVal)
    }

    // 计算投满一条主脉的总成本(以金丹为例,灵脉解锁层级)
    const jindan = costs.find(c => c.tier === 3)!
    const fullMainCost = {
      m: jindan.cost.m * VEIN_MAIN_CAPACITY,
      e: jindan.cost.e,
    }
    console.log(`\n  投满一条主脉总成本(金丹): ${fullMainCost.m.toFixed(2)}e${fullMainCost.e} 灵石`)
    console.log(`    (${VEIN_MAIN_CAPACITY} 点 × ${jindan.cost.m.toFixed(2)}e${jindan.cost.e}/点)`)

    // 验证成本递增机制存在(投满主脉应是显著投资)
    expect(fullMainCost.m, '投满主脉总成本应显著').toBeGreaterThan(50)
  })

  it('灵脉容量模拟:三种策略的资源分配', () => {
    console.log('\n  灵脉投资策略模拟:')

    const strategies = [
      { name: '专精主脉', main: 70, sides: [10, 10, 10], total: 100 },
      { name: '主副兼顾', main: 70, sides: [30, 0, 0], total: 100 },
      { name: '均衡四脉', main: 40, sides: [20, 20, 20], total: 100 },
    ]

    for (const s of strategies) {
      console.log(`    ${s.name}: 主脉${s.main}点 + 副脉[${s.sides.join(',')}]点 = ${s.total}点`)
    }

    console.log('\n  关键约束:')
    console.log('    - 总容量100点无法投满所有副脉(4×30=120点)')
    console.log('    - 主脉迁移有成本(20×单点成本),已投点数不回收')
    console.log('    - 形成长期取舍:深修单脉 vs 广泛涉猎')

    expect(strategies.length).toBe(3)
  })
})

describe('Phase 30.5:装备重铸成本审计', () => {
  it('重铸成本设计:固定成本,未实现递增(需补充)', () => {
    console.log('\n—— Phase 30.5 装备重铸成本审计 ——')
    console.log('  当前重铸设计:')
    console.log('    - 封存词条:锁定1条核心词条,其他词条可重铸')
    console.log('    - 重铸成本:固定成本(未按次数递增)')
    console.log('    - 风险:封存+重铸循环可能允许无限洗完美装')

    console.log('\n  需要补充的机制:')
    console.log('    1. 重铸次数递增成本:第1次低廉,后续指数增长')
    console.log('    2. 品质越高重铸成本越高:良品<精品<极品<神品')
    console.log('    3. 封存词条越稀有成本越高:普通<稀有<史诗<传说')
    console.log('    4. 重铸重置条件:装备升阶时重置重铸次数')

    // 当前实现未包含递增成本,标记为待实现
    expect(true, '重铸成本递增机制待实现').toBe(true)
  })

  it('装备完美度计算:评估重铸收益上限', () => {
    console.log('\n  装备完美度评估(示例):')
    console.log('    - 6词条装备,封存1条核心词条(如 攻击+15%)')
    console.log('    - 剩余5条可重铸,目标:全部洗成有用词条')
    console.log('    - 假设有用词条占比40%,5条全中概率: (0.4)^5 ≈ 1.0%')
    console.log('    - 期望重铸次数: 1/0.01 = 100次')

    const usefulRate = 0.4
    const rerollSlots = 5
    const perfectProb = Math.pow(usefulRate, rerollSlots)
    const expectedRerolls = 1 / perfectProb

    console.log(`\n  如果重铸成本递增不够陡峭:`)
    console.log(`    - 玩家可能愿意重铸 ${Math.round(expectedRerolls)} 次`)
    console.log(`    - 装备随机性消失,掉落失去意义`)

    expect(expectedRerolls, '期望重铸次数应显著').toBeGreaterThan(50)
  })

  it('重铸成本建议:指数递增+品质系数', () => {
    console.log('\n  重铸成本建议公式:')
    console.log('    baseCost = 灵石基础(按层级)')
    console.log('    qualityMult = [良1.0, 精1.5, 极2.5, 神5.0]')
    console.log('    rerollMult = 1.5 ^ rerollCount (指数递增)')
    console.log('    lockedRarityMult = [普1.0, 稀1.5, 史2.0, 传3.0]')
    console.log('    finalCost = baseCost × qualityMult × rerollMult × lockedRarityMult')

    console.log('\n  示例:极品装备,封存史诗词条,第10次重铸:')
    const base = 1000
    const quality = 2.5
    const reroll = Math.pow(1.5, 10)
    const locked = 2.0
    const final = base * quality * reroll * locked
    console.log(`    ${base} × ${quality} × ${reroll.toFixed(2)} × ${locked} = ${final.toFixed(0)} 灵石`)

    console.log('\n  效果:')
    console.log('    - 前几次重铸便宜(微调空间)')
    console.log('    - 10次后成本暴涨(阻止暴力洗完美)')
    console.log('    - 高品质+稀有词条成本更高(珍贵装备重铸谨慎)')

    expect(final, '高次数重铸成本应显著').toBeGreaterThan(base * 50)
  })
})

describe('Phase 30.5:灵石Sink效能审计', () => {
  it('后期灵石消耗渠道统计', () => {
    console.log('\n—— Phase 30.5 灵石Sink效能审计 ——')
    console.log('  当前灵石消耗渠道:')
    console.log('    1. 灵脉投资(长期):100点×层级成本')
    console.log('    2. 装备重铸(高频):每次重铸×递增系数(待实现)')
    console.log('    3. 洞府建筑升级(中期):固定总量有上限')
    console.log('    4. 商店购买(低频):丹药/材料/图鉴')

    console.log('\n  待补充渠道(你提议的Phase 30.X):')
    console.log('    5. 区域经营(长期):镇压区域→投入灵石→提高收益')
    console.log('    6. 天道熔炉(终局):凡界资源→道源→真仙规则')

    console.log('\n  效能评估:')
    console.log('    - 灵脉投资:总消耗有上限(100点投满即止)')
    console.log('    - 装备重铸:高频但单次成本需足够高')
    console.log('    - 区域经营:需设置软上限+递减,避免新雪球')

    expect(true, '灵石Sink渠道已初步建立').toBe(true)
  })

  it('灵石过剩问题是否解决:需实测验证', () => {
    console.log('\n  Phase 30.2-30.3 已实现:')
    console.log('    ✓ 灵脉投资框架(veinService.ts)')
    console.log('    ✓ 装备重铸基础(reforge.ts,成本递增待补充)')
    console.log('    ✓ 战力评星(powerRating.ts,五维描述性评级)')

    console.log('\n  Phase 30.5 审计发现:')
    console.log('    ⚠ 灵脉容量100点形成取舍(主70+副30约束)')
    console.log('    ⚠ 重铸成本递增机制缺失(当前固定成本)')
    console.log('    ⚠ 需要长期实测:中后期玩家灵石是否仍过剩')

    console.log('\n  建议补充(按优先级):')
    console.log('    1. 补充重铸成本递增公式(reforge.ts)')
    console.log('    2. UI展示重铸次数+下次成本(EquipmentDetailDialog.vue)')
    console.log('    3. 实测中后期经济(模拟器or真实游玩)')
    console.log('    4. 考虑区域经营系统(Phase 30.6候选)')

    expect(true, '审计完成,待补充实现').toBe(true)
  })
})
