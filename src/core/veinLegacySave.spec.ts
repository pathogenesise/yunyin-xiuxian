/* eslint-disable no-console -- 兼容读数是给人看的 */
/**
 * 旧档兼容 —— 灵脉上限改成「效果本身的极限」之后,老存档怎么办
 *
 * 旧规则:主脉 70、副脉不设单条上限。于是玩家的点数可以远在新上限之上
 * (真实存档里就有单条数千点的)。改上限若不接住这批点数,轻则面板炸 NaN,
 * 重则老玩家一看自己投了几千点的脉「加成纹丝不动」而以为存档坏了。
 *
 * 本文件钉三件事:
 *   一 **不炸**:任何量级的点数进去,属性、加成文案、面板、功法成本都必须是有限值;
 *   二 **收敛**:超上限的部分不计数值 —— 这正是本次改动要的效果上限口径;
 *   三 **不再进**:超投之后再点投资,立刻被挡(不该继续吞灵石)。
 *
 * 故障注入:把 dongfu.veinMods 里的 effectiveVeinPoints 去掉(改回原始点数),
 * 第一、二条立刻红。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VEINS, VEIN_EFFECT_CAPS } from '@/data/veins'
import { veinEffectText } from '@/ui/veinText'
import { investVein, veinCap } from './veinService'
import { useDongfuStore } from '@/stores/dongfu'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useCultivationStore } from '@/stores/cultivation'
import { computeFinalStats } from './statsCalc'
import { gongfaUpCost, upgradeCost } from './formulas'
import { gongfaUpgradeCost } from './gongfaService'
import { GONGFA } from '@/data/gongfa'
import { qualityDef } from '@/data/qualities'
import { gn, gnZero } from '@/utils/gnum'

/** 远超任一新上限的旧档点数(旧规则下副脉不限,几千点很正常) */
const LEGACY_POINTS = { gather: 100000, craft: 5000, alchemy: 9999, insight: 8888 }

function loadLegacySave(): void {
  const dongfu = useDongfuStore()
  dongfu.veinPoints = { ...LEGACY_POINTS }
  dongfu.sanitize()
}

describe('旧档兼容 · 灵脉超投点数', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    usePlayerStore().major = 5
    useResourcesStore().spiritStone = gn(1e30)
    loadLegacySave()
  })

  it('任何量级的点数进去,属性与文案都是有限值', () => {
    const dongfu = useDongfuStore()
    for (const [key, v] of Object.entries(dongfu.veinMods)) {
      expect(Number.isFinite(v), `${key} 非有限值`).toBe(true)
    }
    expect(Number.isFinite(dongfu.insightDiscount)).toBe(true)
    expect(dongfu.veinTotal, '总点数如实保留,不做削减').toBe(
      LEGACY_POINTS.gather + LEGACY_POINTS.craft + LEGACY_POINTS.alchemy + LEGACY_POINTS.insight
    )
    for (const def of VEINS) {
      const line = veinEffectText(def, 100000)
      expect(typeof line).toBe('string')
      expect(line.length, `${def.name} 的加成文案为空`).toBeGreaterThan(0)
      expect(line, `${def.name} 的读数不该出现 NaN`).not.toContain('NaN')
    }
  })

  it('超上限的部分不计数值:三条有硬上限的脉各停在硬线上', () => {
    const dongfu = useDongfuStore()
    expect(dongfu.veinMods.forgeDiscount ?? 0).toBeCloseTo(VEIN_EFFECT_CAPS.forgeDiscount, 10)
    expect(dongfu.veinMods.alchemyYield ?? 0).toBeCloseTo(VEIN_EFFECT_CAPS.alchemyYield, 10)
    expect(dongfu.insightDiscount).toBeCloseTo(VEIN_EFFECT_CAPS.insightDiscount, 10)
    // 没有硬上限的青木脉(修炼速度)照实计入
    expect(dongfu.veinMods.cultivationSpeed ?? 0).toBeCloseTo(LEGACY_POINTS.gather * 0.004, 6)
    console.log(
      `旧档 10 万点 → 修炼速度 +${((dongfu.veinMods.cultivationSpeed ?? 0) * 100).toFixed(0)}% · ` +
        `强化减耗 +${((dongfu.veinMods.forgeDiscount ?? 0) * 100).toFixed(0)}% · ` +
        `双枚成丹 +${((dongfu.veinMods.alchemyYield ?? 0) * 100).toFixed(0)}% · ` +
        `参悟省耗 −${(dongfu.insightDiscount * 100).toFixed(0)}%`
    )
  })

  it('面板链路吸收超投值:战力有限,各消费点自己的硬线不被推过', () => {
    const dongfu = useDongfuStore()
    const stats = computeFinalStats({
      major: 5,
      sub: 0,
      linggenMult: 1,
      modSources: [dongfu.veinMods],
      equipFlats: { attack: gnZero(), defense: gnZero(), maxHp: gnZero() },
      daoFruit: 0,
      qiRich: false
    })
    expect(Number.isFinite(stats.power.m), '战力非有限值').toBe(true)
    expect(Number.isFinite(stats.attack.m), '攻击非有限值').toBe(true)

    // 强化成本:灵脉给 60% 折扣后,正好落在「成本不低于四成」那条线上
    const withVein = upgradeCost(0, 3, 3, dongfu.veinMods.forgeDiscount ?? 0).dust
    const atCap = upgradeCost(0, 3, 3, VEIN_EFFECT_CAPS.forgeDiscount).dust
    expect(withVein, '灵脉超投不该把强化成本压到硬线之下').toBe(atCap)

    // 功法参悟:悟道灵脉超投 8888 点,折扣仍钳在五成
    const cultivation = useCultivationStore()
    cultivation.learned = {} as never
    const def = GONGFA.find(g => g.maxLevel > 1)!
    cultivation.learned[def.id] = 1 as never
    const base = gongfaUpCost(qualityDef(def.quality).rank, 1)
    const cost = gongfaUpgradeCost(def.id)
    expect(cost, '这条夹具本该读得到功法升级成本').not.toBeNull()
    expect(cost!.wudao, '参悟折扣被推过了五成').toBeLessThan(base)
  })

  it('超投之后再点投资,立刻被挡(不吞灵石)', () => {
    const dongfu = useDongfuStore()
    const stoneBefore = useResourcesStore().spiritStone
    expect(investVein('craft'), '已超上限,不该再收').toBe(false)
    expect(investVein('alchemy')).toBe(false)
    expect(investVein('insight')).toBe(false)
    expect(dongfu.veinPoints.craft).toBe(LEGACY_POINTS.craft)
    expect(useResourcesStore().spiritStone, '被挡下的投资不该扣灵石').toEqual(stoneBefore)
    // 没有硬上限的那条仍可继续投
    expect(investVein('gather'), '修炼速度无硬上限,应可继续投').toBe(true)
    expect(dongfu.veinPoints.gather).toBe(LEGACY_POINTS.gather + 1)
  })

  it('各脉上限点数 × 每点效果正好落在效果硬线上(不多不少)', () => {
    for (const def of VEINS) {
      const cap = veinCap(def.id)
      if (cap === null) continue
      const per = def.id === 'insight' ? 0.004 : (Object.values(def.perPoint)[0] as number)
      expect(cap * per, `${def.name} 到顶时应正好落在硬线上`).toBeCloseTo(VEIN_EFFECT_CAPS[def.capKey!], 10)
      expect((cap + 1) * per, `${def.name} 再投一点就该越过硬线`).toBeGreaterThan(VEIN_EFFECT_CAPS[def.capKey!])
    }
  })
})
