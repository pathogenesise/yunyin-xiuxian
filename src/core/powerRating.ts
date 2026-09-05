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
  labels: { key: keyof Omit<PowerRating, 'labels'>; name: string; stars: number }[]
}

/** 分段:score 依次跨过阈值得 2/3/4/5 星(低于首档为 1 星) */
function toStars(score: number, thresholds: [number, number, number, number]): number {
  let stars = 1
  for (const t of thresholds) {
    if (score >= t) stars += 1
  }
  return stars
}

export function ratePower(stats: FinalStats): PowerRating {
  const m: StatMods = stats.mods
  const v = (k: Parameters<typeof modOf>[1]): number => Math.max(0, modOf(m, k))

  // 进攻:直接增伤 + 暴击期望 + 破甲/处决
  const attackScore = v('attackPct') + v('damageBonus') + v('critRate') * (1 + v('critDamage')) + v('armorPen') * 0.8 + v('executeDamage') * 0.5
  // 生存:防御/生命/减伤/盾/闪避
  const survivalScore = v('defensePct') + v('maxHpPct') + v('damageReduction') * 2 + v('shieldOnStart') + v('shieldPower') * 0.5 + v('dodgeRate') * 1.5
  // 身法:出手/先手/连击
  const speedScore = v('speed') * 2 + v('firstStrike') + v('comboRate') * 1.5
  // 恢复:吸血/回合回复/溢疗(量纲归一:小数值键放大)
  const recoveryScore = v('lifesteal') * 8 + v('regenPerRound') * 20 + v('overhealShield') * 0.6 + v('lowHpReduction') * 0.8
  // 机制:流派成路程度 + 混合副系
  const build = detectBuild(m)
  const mechanicsScore = build ? build.affinity + (build.secondary?.affinity ?? 0) * 0.6 : 0

  const rating = {
    attack: toStars(attackScore, [0.25, 0.6, 1.0, 1.6]),
    survival: toStars(survivalScore, [0.25, 0.6, 1.0, 1.6]),
    speed: toStars(speedScore, [0.15, 0.4, 0.7, 1.1]),
    recovery: toStars(recoveryScore, [0.15, 0.4, 0.8, 1.3]),
    mechanics: toStars(mechanicsScore, [0.3, 0.55, 0.8, 1.1])
  }
  return {
    ...rating,
    labels: [
      { key: 'attack', name: '进攻', stars: rating.attack },
      { key: 'survival', name: '生存', stars: rating.survival },
      { key: 'speed', name: '身法', stars: rating.speed },
      { key: 'recovery', name: '恢复', stars: rating.recovery },
      { key: 'mechanics', name: '机制', stars: rating.mechanics }
    ]
  }
}

/** ★★★☆☆ 形式 */
export function ratingStars(stars: number): string {
  const n = Math.max(1, Math.min(5, stars))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
