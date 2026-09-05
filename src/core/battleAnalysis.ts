/**
 * 战斗分析(Phase 18)—— 从战斗遥测推导「为什么输 / 表现如何」
 * 原则:解释原因、给方向,不替玩家做决定
 */
import type { CombatResult, CombatSideStats, GNum } from '@/types'
import { ratio } from '@/utils/gnum'
import { formatGN, formatPercent } from '@/utils/format'
import { BUILD_STYLES } from './buildDetect'

export interface AnalysisFinding {
  text: string
  /** 该问题指向的流派方向(styleId 列表,按相关度排序) */
  styleHints: string[]
}

export interface BattleAnalysis {
  headline: string
  findings: AnalysisFinding[]
  /** 可借力的方向(排除当前主流派,至多 2 条) */
  directions: { styleName: string; reason: string }[]
  /** 硬核数据行 */
  dataRows: { label: string; value: string }[]
}

const PIERCE_SHARE_WARN = 0.35
const MISS_RATE_WARN = 0.28
const BIG_HIT_WARN = 0.38
const LONG_FIGHT_ROUNDS = 30
const LOW_HEAL_SHARE = 0.12
const STUN_WARN = 3

function share(part: GNum, whole: GNum): number {
  if (whole.m === 0) return 0
  return Math.max(0, Math.min(1, ratio(part, whole)))
}

/** 硬核数据面板行(胜负皆可看) */
export function battleDataRows(result: CombatResult): { label: string; value: string }[] {
  const s = result.stats
  if (!s) return []
  const p = s.player
  const attempts = p.hitsLanded + p.missedHits
  const rows: { label: string; value: string }[] = [
    { label: '总输出', value: formatGN(p.dealt) },
    { label: '总承伤', value: formatGN(p.taken) },
    { label: '真伤承伤占比', value: formatPercent(share(p.pierceTaken, p.taken)) },
    { label: '单次最大承伤', value: formatGN(p.biggestHitTaken) },
    { label: '治疗量', value: formatGN(p.healed) },
    { label: '护盾吸收', value: formatGN(p.shieldAbsorbed) },
    { label: '命中 / 落空', value: `${p.hitsLanded} / ${p.missedHits}` },
    { label: '暴击 / 连击 / 反击', value: `${p.crits} / ${p.combos} / ${p.counters}` },
    { label: '神通 / 法宝触发', value: `${p.skillCasts} / ${p.artifactProcs}` }
  ]
  if (attempts === 0) return rows.slice(0, 6)
  return rows
}

function defeatFindings(p: CombatSideStats, maxHpProxy: GNum, rounds: number): AnalysisFinding[] {
  const findings: AnalysisFinding[] = []
  const pierceShare = share(p.pierceTaken, p.taken)
  if (pierceShare >= PIERCE_SHARE_WARN) {
    findings.push({
      text: `真伤占总承伤 ${formatPercent(pierceShare, 0)},护盾与减伤被绕过`,
      styleHints: ['muze', 'beishui']
    })
  }
  const attempts = p.hitsLanded + p.missedHits
  const missRate = attempts > 0 ? p.missedHits / attempts : 0
  if (missRate >= MISS_RATE_WARN) {
    findings.push({
      text: `${p.missedHits} 次出手落空(落空率 ${formatPercent(missRate, 0)}),连击与暴击难以衔接`,
      styleHints: ['gangdun', 'muze']
    })
  }
  const bigShare = share(p.biggestHitTaken, maxHpProxy)
  if (bigShare >= BIG_HIT_WARN) {
    findings.push({
      text: `单次重击最高打掉你 ${formatPercent(bigShare, 0)} 气血,硬抗不是办法`,
      styleHints: ['gangdun', 'lianji']
    })
  }
  if (rounds >= LONG_FIGHT_ROUNDS && share(p.healed, p.taken) < LOW_HEAL_SHARE) {
    findings.push({
      text: `鏖战 ${rounds} 回合却几乎没有回复,久战无以为继`,
      styleHints: ['muze', 'beishui']
    })
  }
  if (p.stunnedTurns >= STUN_WARN) {
    findings.push({
      text: `${p.stunnedTurns} 个回合被震慑打断,节奏尽失`,
      styleHints: ['gangdun']
    })
  }
  return findings
}

/**
 * 战斗分析
 * @param currentStyleId 当前主流派(用于排除自荐)
 */
export function analyzeBattle(result: CombatResult, currentStyleId: string | null): BattleAnalysis | null {
  const s = result.stats
  if (!s) return null
  const dataRows = battleDataRows(result)
  if (result.win) {
    return {
      headline: `此战 ${result.rounds} 回合而胜,战后气血 ${Math.round(result.playerHpPct * 100)}%`,
      findings: [],
      directions: [],
      dataRows
    }
  }
  // 用 taken+healed 近似血量池(承伤超过血池才落败)
  const p = s.player
  const findings = defeatFindings(p, p.taken, result.rounds)
  const hintCount = new Map<string, number>()
  for (const f of findings) {
    f.styleHints.forEach((id, idx) => {
      if (id !== currentStyleId) hintCount.set(id, (hintCount.get(id) ?? 0) + (2 - idx))
    })
  }
  const directions = [...hintCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => {
      const style = BUILD_STYLES.find(x => x.id === id)!
      return { styleName: style.name, reason: style.desc }
    })
  return {
    headline: `败于第 ${result.rounds} 回合`,
    findings: findings.length > 0 ? findings : [{ text: '并无明显短板,只是道行尚浅——修为与装备再进一步即可', styleHints: [] }],
    directions,
    dataRows
  }
}
