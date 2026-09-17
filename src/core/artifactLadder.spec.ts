/* eslint-disable no-console -- 品阶阶梯表是给人复核的 */
/**
 * 法宝品阶阶梯 —— 「越深的地界越强」这句话得有判据
 *
 * 数据文件自己写着这条承诺:`fromTier` 越深、品阶越高的法宝,不该比浅处的更弱
 * (见 data/artifacts 头部那段"品阶既是稀缺标签,也是强度阶梯")。
 * 但承诺在表里是会破的,而且破得很安静 —— 实测(本条判据就是为它写的):
 *
 *   青锋仙剑(t23 灵品)造成 348% 伤害,而镇岳印(t11 **凡品**)是 340%
 *   星轨盘(t22 精品)250% × 品阶 = 316% < 混沌钟(t19)632%
 *   仙鼎(t23 精品)回血 19% < 玉净瓶(t6 凡品)20%
 *   云海幡(t21 精品)护盾 16% < 千机伞(t10 凡品)26%
 *   玉京道印(t25 灵品)削攻 26% < 摄魂铃(t12 凡品)30%
 *
 * 原因不是公式错(品阶倍率照乘),而是**基线各自为政**:每一件单看都合情合理,
 * 连起来就断了阶梯。故这里把"阶梯"变成判据:同一效果族内,按 (fromTier, 品阶)
 * 排序后,**玩家看到的数值与被动预算都不许回落**。
 *
 * 容差只有两处,且都是口径本身的粒度:budgetOfMods 取整到 0.1;品阶倍率的舍入
 * 让"相等"可能差千分之一。除此之外任何回落都是真回落。
 */
import { describe, expect, it } from 'vitest'
import { ARTIFACTS, artifactValue } from '@/data/artifacts'
import { qualityDef } from '@/data/qualities'
import { budgetOfMods } from './ruleBudget'
import type { ArtifactDef } from '@/types'

/**
 * 被动预算的容差 —— 比取整粒度(0.1)宽得多,因为**被动是按身份设计的**:
 * 混沌青莲给修速、神钟给防御、帝阙神符给进阶率,拿它们的预算在族内横比本就不是同一个量纲。
 * 故这一条只拦"大回落"(阶梯断了半档以上),不追究构造差异 ——
 * 真正严格的承诺是上面那条**效果数值**不降(同族同单位,可比)。
 */
const BUDGET_EPS = 0.5
/** 数值的舍入容差:品阶倍率最后一位的舍入 */
const AMOUNT_EPS = 0.002

interface Row {
  def: ArtifactDef
  amount: number
  budget: number
  qualityRank: number
}

/** 同一效果族的阶梯(按 fromTier → 品阶排序) */
function ladders(): Map<string, Row[]> {
  const byType = new Map<string, ArtifactDef[]>()
  for (const def of ARTIFACTS) {
    const type = def.active.effect.type
    byType.set(type, [...(byType.get(type) ?? []), def])
  }
  const out = new Map<string, Row[]>()
  for (const [type, defs] of byType) {
    const rows = defs
      .map(def => {
        const v = artifactValue(def, 0)
        return { def, amount: v.active.amount, budget: budgetOfMods(v.passive), qualityRank: qualityDef(def.quality).rank }
      })
      .sort((a, b) => a.def.fromTier - b.def.fromTier || a.qualityRank - b.qualityRank)
    out.set(type, rows)
  }
  return out
}

describe('法宝品阶阶梯', () => {
  it('打印各族阶梯(数值口径:凡品零重 × 品阶) ', () => {
    console.log('\n—— 法宝阶梯(效果数值 / 被动预算;按层级→品阶排序) ——')
    for (const [type, rows] of ladders()) {
      console.log(`  ${type}:`)
      for (const r of rows) {
        console.log(
          `    t${String(r.def.fromTier).padStart(2)} ${qualityDef(r.def.quality).name} ` +
            `${r.def.name.padEnd(6)} 数值 ${r.amount.toFixed(3).padStart(6)} · 被动预算 ${r.budget.toFixed(1)}`
        )
      }
    }
    expect(ARTIFACTS.length).toBeGreaterThan(40)
  })

  it('同一效果族内,效果数值不随层级/品阶回落', () => {
    for (const [type, rows] of ladders()) {
      // 震慑没有数值(它买的是"打断一手"),只守被动预算那条
      if (type === 'stun') continue
      for (let i = 1; i < rows.length; i += 1) {
        const prev = rows[i - 1]!
        const cur = rows[i]!
        expect(
          cur.amount,
          `${cur.def.name}(t${cur.def.fromTier} ${qualityDef(cur.def.quality).name}) 的数值 ${cur.amount.toFixed(3)} ` +
            `低于更浅/更低的 ${prev.def.name}(t${prev.def.fromTier} ${qualityDef(prev.def.quality).name}) ${prev.amount.toFixed(3)}`
        ).toBeGreaterThanOrEqual(prev.amount - AMOUNT_EPS)
      }
    }
  })

  it('同一效果族内,被动预算不随层级/品阶回落', () => {
    for (const rows of ladders().values()) {
      for (let i = 1; i < rows.length; i += 1) {
        const prev = rows[i - 1]!
        const cur = rows[i]!
        expect(
          cur.budget,
          `${cur.def.name}(t${cur.def.fromTier} ${qualityDef(cur.def.quality).name}) 的被动预算 ${cur.budget.toFixed(1)} ` +
            `低于更浅/更低的 ${prev.def.name}(t${prev.def.fromTier} ${qualityDef(prev.def.quality).name}) ${prev.budget.toFixed(1)}`
        ).toBeGreaterThanOrEqual(prev.budget - BUDGET_EPS)
      }
    }
  })

  /**
   * 与 `ruleUniverse.spec` 的单件预算上限同源:阶梯往上抬之后,不许撞破那条线。
   * (上限是 5;本表最高的几件在 2.6 上下,留得住设计空间。)
   */
  it('抬完阶梯仍在单件预算上限之内', () => {
    for (const def of ARTIFACTS) {
      const b = budgetOfMods(artifactValue(def, 0).passive)
      expect(b, `${def.name} 被动预算 ${b}`).toBeLessThan(5)
    }
  })
})
