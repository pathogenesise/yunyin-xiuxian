/**
 * 战力分解 —— Phase 30.2
 *
 * 战力总数继续存在,但降级为"综合参考";五维星级承担"读懂构筑形状"的职责:
 * 进攻 / 生存 / 身法 / 恢复 / 机制。
 * 星级基于词条合计的定性分段,不做精确排名——两个 4 星构筑谁强,由环境与相性决定。
 */
import type { FinalStats, StatMods } from '@/types'
import { detectBuild } from './buildDetect'
import { modOf } from './statsCalc'

export interface PowerRating {
  /** 1~5 星 */
  attack: number
  survival: number
  speed: number
  recovery: number
  mechanics: number
  labels: PowerDimension[]
  /** 星级分档:得分跨过哪一档就得几星 —— 界面解释「为什么是这个星」读它 */
  thresholds: Record<PowerDimKey, [number, number, number, number]>
}

export type PowerDimKey = 'attack' | 'survival' | 'speed' | 'recovery' | 'mechanics'

/** 一条「算进得分里的东西」:词条名 + 折算后的贡献(贡献之和 = 该维得分) */
export interface PowerTerm {
  label: string
  /** 按该维权重折算后的贡献 —— 相加就是得分 */
  contribution: number
  /** 原始词条值(面板上那个数),便于玩家对照 */
  raw: number
}

export interface PowerDimension {
  key: PowerDimKey
  name: string
  stars: number
  score: number
  terms: PowerTerm[]
}

/** 分段:score 依次跨过阈值得 2/3/4/5 星(低于首档为 1 星) */
function toStars(score: number, thresholds: [number, number, number, number]): number {
  let stars = 1
  for (const t of thresholds) {
    if (score >= t) stars += 1
  }
  return stars
}

const THRESHOLDS: Record<PowerDimKey, [number, number, number, number]> = {
  attack: [0.25, 0.6, 1.0, 1.6],
  survival: [0.25, 0.6, 1.0, 1.6],
  speed: [0.15, 0.4, 0.7, 1.1],
  recovery: [0.15, 0.4, 0.8, 1.3],
  mechanics: [0.3, 0.55, 0.8, 1.1]
}

const DIM_NAMES: Record<PowerDimKey, string> = {
  attack: '进攻',
  survival: '生存',
  speed: '身法',
  recovery: '恢复',
  mechanics: '机制'
}

/**
 * 五维评级 —— 每一维都带上「它是怎么算出来的」。
 *
 * 面板此前只给星级:玩家看到「生存 ★★☆☆☆」,不知道差在哪一条词条。故这里
 * 每维都返回 terms —— **贡献之和恰好等于该维得分**,星级只是得分跨过阈值的结果。
 * 这与属性来源明细是同一条规矩:解释这个数,就得算得回这个数。
 */
export function ratePower(stats: FinalStats): PowerRating {
  const m: StatMods = stats.mods
  const v = (k: Parameters<typeof modOf>[1]): number => Math.max(0, modOf(m, k))
  const term = (label: string, raw: number, weight = 1): PowerTerm => ({ label, raw, contribution: raw * weight })

  // 进攻:直接增伤 + 暴击期望 + 破甲/处决
  const critRaw = v('critRate')
  const critTerm: PowerTerm = {
    label: '暴击率×(1+暴伤)',
    raw: critRaw,
    contribution: critRaw * (1 + v('critDamage'))
  }
  const attackTerms = [
    term('攻击加成', v('attackPct')),
    term('造成伤害', v('damageBonus')),
    critTerm,
    term('破甲', v('armorPen'), 0.8),
    term('处决伤害', v('executeDamage'), 0.5)
  ]
  // 生存:防御/生命/减伤/盾/闪避
  const survivalTerms = [
    term('防御加成', v('defensePct')),
    term('气血加成', v('maxHpPct')),
    term('伤害减免', v('damageReduction'), 2),
    term('开战护盾', v('shieldOnStart')),
    term('护盾强度', v('shieldPower'), 0.5),
    term('闪避率', v('dodgeRate'), 1.5)
  ]
  // 身法:出手/先手/连击
  const speedTerms = [term('出手速度', v('speed'), 2), term('先手', v('firstStrike')), term('连击率', v('comboRate'), 1.5)]
  // 恢复:吸血/回合回复/溢疗(量纲归一:小数值键放大)
  const recoveryTerms = [
    term('吸血', v('lifesteal'), 8),
    term('回合回复', v('regenPerRound'), 20),
    term('溢疗转盾', v('overhealShield'), 0.6),
    term('残血减伤', v('lowHpReduction'), 0.8)
  ]
  // 机制:流派成路程度 + 混合副系
  const build = detectBuild(m)
  const mechanicsTerms: PowerTerm[] = []
  if (build) {
    mechanicsTerms.push({ label: `成路·${build.style.name}`, raw: build.affinity, contribution: build.affinity })
    const second = build.secondary
    if (second) {
      mechanicsTerms.push({
        label: `副系·${second.style.name}`,
        raw: second.affinity,
        contribution: second.affinity * 0.6
      })
    }
  }

  const dims: Record<PowerDimKey, PowerTerm[]> = {
    attack: attackTerms,
    survival: survivalTerms,
    speed: speedTerms,
    recovery: recoveryTerms,
    mechanics: mechanicsTerms
  }
  /*
   * 得分仍按原来的算式单独算一遍,不从 terms 反推 —— 否则「明细之和 = 得分」
   * 成了同义反复:删掉一条词条,两边一起少,audit 永远红不了。
   * 这里刻意让两条路各走各的,它们对不上就是有人改了算式没改明细。
   */
  const scores: Record<PowerDimKey, number> = {
    attack:
      v('attackPct') + v('damageBonus') + v('critRate') * (1 + v('critDamage')) + v('armorPen') * 0.8 + v('executeDamage') * 0.5,
    survival:
      v('defensePct') + v('maxHpPct') + v('damageReduction') * 2 + v('shieldOnStart') + v('shieldPower') * 0.5 + v('dodgeRate') * 1.5,
    speed: v('speed') * 2 + v('firstStrike') + v('comboRate') * 1.5,
    recovery: v('lifesteal') * 8 + v('regenPerRound') * 20 + v('overhealShield') * 0.6 + v('lowHpReduction') * 0.8,
    mechanics: build ? build.affinity + (build.secondary?.affinity ?? 0) * 0.6 : 0
  }
  const labels: PowerDimension[] = (Object.keys(DIM_NAMES) as PowerDimKey[]).map(key => {
    const terms = dims[key].filter(t => t.contribution !== 0)
    const score = scores[key]
    return { key, name: DIM_NAMES[key], stars: toStars(score, THRESHOLDS[key]), score, terms }
  })
  const stars = Object.fromEntries(labels.map(l => [l.key, l.stars])) as Record<PowerDimKey, number>
  return { ...stars, labels, thresholds: THRESHOLDS }
}

/** ★★★☆☆ 形式 */
export function ratingStars(stars: number): string {
  const n = Math.max(1, Math.min(5, stars))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
