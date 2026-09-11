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

/** 纪元先后比较(19.0 < 19.5 < 20.0)——只认点号分段数字,不引第三方 semver */
export function rulesetBefore(a: string, b: string): boolean {
  const pa = a.split('.').map(n => Number(n) || 0)
  const pb = b.split('.').map(n => Number(n) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y
  }
  return false
}

/** 此痕是否录于旧纪 —— 当年那局的规则,与今日已不是一回事 */
export function isStaleRuleset(version: string | undefined): boolean {
  return version !== undefined && version !== RULESET_VERSION
}

/**
 * 某个纪元之后,天道改了什么(不含该纪元本身)。
 *
 * 战录上只标了纪元号,玩家看不出"变了什么"——
 * 忆战/重写前的这一句解释,就是把这些年改过的规则摆到台面上。
 * 无纪元(远古战录)时返回空:不知道录于何时,就不装作知道。
 */
export function rulesetChangesSince(version: string | undefined): { version: string; note: string }[] {
  if (!version) return []
  return RULESET_CHANGELOG.filter(c => rulesetBefore(version, c.version))
}
