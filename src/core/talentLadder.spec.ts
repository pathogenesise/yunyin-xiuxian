/* eslint-disable no-console -- 等阶与领地的对照表是给人看的 */
/**
 * 天赋四等 —— 稀有度到底承诺了什么
 *
 * ## 缘起:一次"看起来成立、其实是尺子拿错"的告警
 *
 * 有人按 `ruleBudget.budgetOfMods` 汇总了每一等,得到:
 *   凡赋 n=7 [0.3,1.0] · 灵赋 n=14 [0.5,1.7] · 天赋 n=7 [0.4,1.2] · 道赋 n=5 [1.4,2.8]
 * 于是判定"天赋的下界低于凡赋的下界"(天命 0.4),并打算重排数据。
 *
 * 这个判定是**尺子拿错**:budgetOfMods 是**机制复杂度会计**(它自己的注释就写着
 * "设计侧的复杂度会计,不是玩家资源"),它的参考档按战斗口径定,于是
 * 条件类战斗词条(低血/反击/连击)算得重、运气与进阶率算得轻。
 * 拿它当强度阶梯,就会得出"天命(进阶率+运气)该加强、孤勇(低血反击)该削弱"这种结论 ——
 * 而玩家感知的不是复杂度,是"这一等给了我什么"。
 *
 * ## 稀有度真正承诺的三件事(本文件守的就是这三条)
 *
 *   一 **不被支配**:更常见的天赋不得在**每一个**属性上都压住更稀有的那一件
 *      (严格劣于常见位 = 玩家会觉得自己抽了个废牌);实测 0 例。
 *   二 **期望更强**:每一等的平均复杂度预算单调递增(0.54 · 0.86 · 0.90 · 2.18);
 *      同时后面一等不得整体弱于前一等 —— 这条是波动,不是保证。
 *   三 **各有领地**:每一等至少拥有一项"全池最高"的属性 —— 没有一等是填充物。
 *      实测:凡赋=速度/灵石/回复 · 灵赋=运气/掉落/炼丹炼器/低血反击 ·
 *      天赋=防御/伤害加成/渡劫抗性 · 道赋=攻击/暴击/寿元/修速/生命。
 *
 * 三条合起来解释了那两个"看起来越阶"的件:天命提前占了一角道赋的领地(进阶率),
 * 孤勇是条件类词条的堆积(预算高、但要濒危才兑现)。**故此轮不改数值,改判据** ——
 * 为一把错的尺子重排 33 件数据,才是真把平衡改坏。
 */
import { describe, expect, it } from 'vitest'
import { TALENTS } from '@/data/talents'
import { budgetOfMods } from './ruleBudget'

const GRADES = [1, 2, 3, 4] as const
const GRADE_NAME: Record<number, string> = { 1: '凡赋', 2: '灵赋', 3: '天赋', 4: '道赋' }

/** a 是否在**每一个**属性上都被 b 压住(且至少一项更差)→ 稀有位被常见位支配 */
function dominatedBy(a: (typeof TALENTS)[number], b: (typeof TALENTS)[number]): boolean {
  if (b.grade >= a.grade) return false
  const keys = new Set([...Object.keys(a.mods), ...Object.keys(b.mods)])
  let strictlyWorse = false
  for (const k of keys) {
    const av = (a.mods as Record<string, number>)[k] ?? 0
    const bv = (b.mods as Record<string, number>)[k] ?? 0
    if (av > bv) return false
    if (av < bv) strictlyWorse = true
  }
  return strictlyWorse
}

/** 某一等的平均复杂度预算(只作参考读数,不是强度) */
function avgBudget(grade: number): number {
  const list = TALENTS.filter(t => t.grade === grade).map(t => budgetOfMods(t.mods))
  return list.reduce((a, b) => a + b, 0) / list.length
}

/** 某一等独占领地的属性(该属性全池最高落在这一等) */
function territoryOf(grade: number): string[] {
  const bestByStat = new Map<string, { grade: number; v: number }>()
  for (const t of TALENTS) {
    for (const [k, v] of Object.entries(t.mods)) {
      const cur = bestByStat.get(k)
      if (!cur || (v ?? 0) > cur.v) bestByStat.set(k, { grade: t.grade, v: v ?? 0 })
    }
  }
  return [...bestByStat.entries()].filter(([, x]) => x.grade === grade).map(([k]) => k)
}

describe('天赋四等 · 稀有度的三条承诺', () => {
  it('对照表:等阶 × 件数 × 均预算 × 属性领地', () => {
    console.log('\n—— 天赋四等(预算是复杂度会计,不是强度) ——')
    for (const g of GRADES) {
      const list = TALENTS.filter(t => t.grade === g)
      console.log(
        `  ${GRADE_NAME[g]}(权重 ${g === 1 ? 100 : g === 2 ? 45 : g === 3 ? 15 : 4}) n=${String(list.length).padStart(2)} ` +
          `均预算 ${avgBudget(g).toFixed(2)} · 领地:${territoryOf(g).join(' / ') || '(无)'}`
      )
    }
    expect(TALENTS.length).toBeGreaterThan(30)
  })

  it('① 不被支配:没有稀有位在每一个属性上都被常见位压住', () => {
    const bad: string[] = []
    for (const a of TALENTS) {
      for (const b of TALENTS) {
        if (a.id === b.id) continue
        if (dominatedBy(a, b)) {
          bad.push(`${a.name}(${GRADE_NAME[a.grade]}) 被更常见的 ${b.name}(${GRADE_NAME[b.grade]}) 全面压住`)
        }
      }
    }
    expect(bad, `这些天赋抽到就等于废牌:\n${bad.join('\n')}`).toEqual([])
  })

  it('② 期望更强:平均预算随等阶单调递增', () => {
    const avgs = GRADES.map(g => avgBudget(g))
    console.log(`\n  平均预算:${avgs.map((a, i) => `${GRADE_NAME[GRADES[i]!]} ${a.toFixed(2)}`).join(' < ')}`)
    for (let i = 1; i < avgs.length; i += 1) {
      expect(avgs[i], `${GRADE_NAME[GRADES[i]!]} 的均预算不高于 ${GRADE_NAME[GRADES[i - 1]!]}`).toBeGreaterThan(
        avgs[i - 1]!
      )
    }
  })

  it('③ 各有领地:每一等至少拥有一项全池最高的属性 —— 没有一等是填充物', () => {
    for (const g of GRADES) {
      expect(territoryOf(g).length, `${GRADE_NAME[g]} 没有任何属性上的领地 —— 这一等只是陪衬`).toBeGreaterThan(0)
    }
  })
})
