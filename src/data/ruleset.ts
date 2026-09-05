/**
 * 规则纪元(Phase 25)—— 规则体系的版本化
 * 道痕会记下每一战所处的纪元;规则变更后,旧道痕的「忆战」将标注天道已变
 */

export const RULESET_VERSION = '25.0'

/** 纪元变迁史(只记改变战斗规则本身的变更,不记内容增删) */
export const RULESET_CHANGELOG: { version: string; note: string }[] = [
  { version: '19.0', note: '超时判负 · 护盾上限 50% · 模拟预算守恒' },
  { version: '19.5', note: '同词条多来源 100/75/50/25 递减' },
  { version: '20.0', note: '规则注入层:道途 / 特殊世界(CombatRules)' },
  { version: '21.0', note: '契约 / 变数 / 路线 / 组合技 / 长生印(perRounds)' },
  { version: '25.0', note: '规则宇宙审计基线固化' }
]
