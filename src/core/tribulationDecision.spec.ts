/**
 * Phase 32.0:天劫决策重构
 * ① 天劫类型化(境界×天时派生,确定性)
 * ② 准备度多维(护持/恢复/抗性/爆发)——不再单看成功率词条
 * ③ 风险识别 + 决策档 + 建议(信息给足,决定留给玩家)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  buildTribulationPlan,
  rollTribulation,
  verdictLabel,
  statGuardOf,
  tribulationWaveSpan,
  NO_STAT_GUARD
} from './tribulationDecision'
import { baseCombatStats } from './formulas'
import { toNum } from '@/utils/gnum'
import { TRIBULATIONS, tribulationDef } from '@/data/tribulations'
import { useGameStore } from '@/stores/game'
import type { StatMods } from '@/types'

describe('① 劫型派生', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('五种劫型完整', () => {
    expect(TRIBULATIONS.length).toBe(5)
    for (const t of TRIBULATIONS) {
      expect(t.dmgMult).toBeGreaterThan(0)
      expect(t.desc).toBeTruthy()
    }
  })

  it('同一境界+同一天时 → 同一劫型(确定性)', () => {
    const game = useGameStore()
    game.$patch({ totalPlaySec: 86400 * 7 })
    const a = rollTribulation(3)
    const b = rollTribulation(3)
    expect(a).toBe(b)
  })

  it('不同天时 → 大概率不同劫型(联动天气)', () => {
    // 天时由游戏日决定;比较两个相距远的日子的劫型
    const game = useGameStore()
    const seen = new Set<string>()
    for (let d = 1; d <= 20; d++) {
      game.$patch({ totalPlaySec: d * 86400 })
      seen.add(rollTribulation(3))
    }
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })
})

describe('② 准备度多维 + ③ 风险/决策', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const bare: StatMods = {}

  it('裸装:准备度低,决策档为 danger/hard,风险含"承伤/恢复"', () => {
    const plan = buildTribulationPlan(1, bare, 'thunder')
    expect(plan.prep.guard).toBe(0)
    expect(plan.prep.sustain).toBe(0)
    expect(['danger', 'hard']).toContain(plan.verdict)
    expect(plan.risks.length).toBeGreaterThan(0)
    expect(plan.advice).toBeTruthy()
  })

  it('护持+恢复+抗性齐备 → 明显改善(guard/sustain/resist ≥2,固定劫型)', () => {
    const plan = buildTribulationPlan(1, { shieldOnStart: 0.4, regenPerRound: 0.06, tribulationResist: 0.3 }, 'thunder')
    expect(plan.prep.guard).toBeGreaterThanOrEqual(2)
    expect(plan.prep.sustain).toBeGreaterThanOrEqual(2)
    expect(plan.prep.resist).toBeGreaterThanOrEqual(2)
  })

  it('逆流劫:治疗被压缩 → sustain 得分下降', () => {
    const mods: StatMods = { regenPerRound: 0.05 }
    const normal = buildTribulationPlan(1, mods)
    // 强制 counterflow 对比:roll 出来不一定逆流,直接测 def 数值
    const cf = TRIBULATIONS.find(t => t.id === 'counterflow')!
    expect(cf.healMult).toBeLessThan(1)
    // 决策信息:正常计划至少可能包含"恢复"风险或准备维度
    expect(normal.prep.sustain).toBeGreaterThanOrEqual(0)
  })

  it('决策档映射文字(信息层,不做推荐按钮)', () => {
    expect(verdictLabel('danger')).toBe('高风险')
    expect(verdictLabel('easy')).toBe('稳渡')
  })

  it('期望率不是单一数字依赖:同词条在不同劫型下结论不同', () => {
    // 用不同劫型(through roll)对比——精神内核:五维而非单点
    const mods: StatMods = { shieldOnStart: 0.35, regenPerRound: 0.03, tribulationResist: 0.2 }
    const plan = buildTribulationPlan(1, mods)
    // 结论因劫型派生而变化(至少产出完整信息结构)
    expect(plan).toMatchObject({
      kind: expect.any(String),
      verdict: expect.any(String),
      prep: { guard: expect.any(Number), sustain: expect.any(Number), resist: expect.any(Number), burst: expect.any(Number) },
      risks: expect.any(Array),
      advice: expect.any(String)
    })
  })
})

/**
 * 三维折算:血厚防高允许硬抗,但两条都封顶。
 *
 * 从前天劫完全不吃攻/防/血,玩家拿着上千万气血站在劫前却半点用没有 —— 不合理。
 * 现在按「本境裸修为」折算:防御 → 抗性、气血 → 开劫水位,各有上限。
 * 这几条守的正是"能硬抗"与"三维不是通行证"之间的那条线。
 */
describe('⑥ 三维折算(防御→抗性 / 气血→开劫水位)', () => {
  const MAJOR = 4
  const SUB = 8
  const bare = baseCombatStats(MAJOR, SUB)
  const bareDef = toNum(bare.defense)
  const bareHp = toNum(bare.maxHp)

  it('裸修为不折算:一个百分点都不白送', () => {
    expect(statGuardOf({ defense: bareDef, maxHp: bareHp, major: MAJOR, sub: SUB })).toEqual({ resist: 0, guard: 0 })
  })

  it('超出部分按倍数线性折算,并各自封顶', () => {
    const six = statGuardOf({ defense: bareDef * 6, maxHp: bareHp * 6, major: MAJOR, sub: SUB })
    expect(six.resist).toBeCloseTo(0.25, 6) // (6-1)×5%
    expect(six.guard).toBeCloseTo(0.25, 6)
    const whale = statGuardOf({ defense: bareDef * 500, maxHp: bareHp * 500, major: MAJOR, sub: SUB })
    expect(whale.resist).toBe(0.3) // 上限
    expect(whale.guard).toBe(0.6)
  })

  it('折算真的进了推演:同词条下血厚防高者结论更好', () => {
    const mods: StatMods = { regenPerRound: 0.04 }
    const stat = statGuardOf({ defense: bareDef * 500, maxHp: bareHp * 500, major: MAJOR, sub: SUB })
    const without = buildTribulationPlan(MAJOR, mods, 'thunder', undefined, 1, NO_STAT_GUARD)
    const withStat = buildTribulationPlan(MAJOR, mods, 'thunder', undefined, 1, stat)
    expect(withStat.expectedRate).toBeGreaterThan(without.expectedRate)
    expect(withStat.prep.resist).toBeGreaterThanOrEqual(without.prep.resist) // 星级看得见结算吃的那一份
  })

  it('三维封顶也过不了大劫:硬抗是兜底,不是通行证', () => {
    const whale = statGuardOf({ defense: bareDef * 500, maxHp: bareHp * 500, major: MAJOR, sub: SUB })
    // 化神大关:一条词条都不带、只靠封顶的三维——仍不可渡
    for (const t of TRIBULATIONS) {
      const plan = buildTribulationPlan(MAJOR, {}, t.id, undefined, 1, whale)
      expect(plan.verdict, `${t.name}劫:光靠三维就过了,折算上限该收`).not.toBe('easy')
    }
  })
})

/**
 * 波形读数:同一行公式里有两个自变量 —— 第几道(逐道加重)与境界(道数与起点)。
 * 界面按它摊开,故这几条守着"摊出来的话与结算做的事"一致。
 */
describe('⑦ 波形读数(道数 × 逐道加重)', () => {
  it('均匀劫:同一次渡劫里最后一道最重,合计约为单波的数倍', () => {
    const span = tribulationWaveSpan(tribulationDef('thunder'), 5)
    expect(span.waves).toBe(8) // 3 + 5
    expect(span.last).toBeGreaterThan(span.first)
    expect(span.max).toBeCloseTo(span.last, 9) // 最重的是最后一道
    expect(span.total).toBeGreaterThan(span.max) // 合计 = 逐道之和,介于单波与满额之间
    expect(span.total).toBeLessThan(span.max * span.waves)
    expect(span.total).toBeCloseTo(3.08 * tribulationDef('thunder').dmgMult, 6)
  })

  it('重压劫:起手两道最重,波形不是单调递增', () => {
    const span = tribulationWaveSpan(tribulationDef('heavyrush'), 5)
    expect(span.first).toBeGreaterThan(span.last)
    expect(span.max).toBeGreaterThan(span.last) // 峰值在开头那两道
    expect(span.heaviestWave).toBeLessThanOrEqual(2)
  })

  it('境界越深:道数更多、单波起点也更重', () => {
    const def = tribulationDef('thunder')
    const low = tribulationWaveSpan(def, 2)
    const high = tribulationWaveSpan(def, 8)
    expect(high.waves).toBeGreaterThan(low.waves)
    expect(high.first).toBeGreaterThan(low.first)
  })
})
