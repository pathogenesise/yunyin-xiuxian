/**
 * 战斗分析(Phase 18)—— 从战斗遥测推导「为什么输 / 表现如何」
 * 原则:解释原因、给方向,不替玩家做决定
 */
import type { CombatResult, CombatSideStats, FoeOrigin, GNum } from '@/types'
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

/** 有没有账可报 —— 也含「比这一层该有的还薄」这种反向的账 */
function hasAccount(o: FoeOrigin): boolean {
  return o.parts.some(p => p.ratio !== 1) || o.damageBonus > 0 || o.damageReduction > 0
}

/** 敌人是不是真的占了便宜(更厚、或增伤减伤不为零)—— 决定要不要在败因里点名 */
function hasEdge(o: FoeOrigin): boolean {
  return o.ratio > 1 || o.damageBonus > 0 || o.damageReduction > 0
}

/** 倍数用两位小数:1.113^20 这种数写成 1.9 与写成 1.87 对玩家是两回事 */
const ratioText = (n: number): string => `×${(Math.round(n * 100) / 100).toFixed(2)}`

/** 各项来源摊成一行:「层级补偿 ×1.90 · 地界凶险 ×1.15」 */
export function foeOriginPartsText(origin: FoeOrigin): string {
  return origin.parts
    .filter(p => p.ratio !== 1)
    .map(p => `${p.label} ${ratioText(p.ratio)}`)
    .join(' · ')
}

/**
 * 敌人加成的账目 —— 哪几件事、各乘了多少。
 *
 * 与「先手判定」同一条纪律:把式子摊开,而不是给一句「敌人很强」。
 * 空数组表示这只敌人身上没有额外加成(中性),调用方据此决定要不要占字数。
 */
export function foeOriginLines(origin: FoeOrigin | undefined): string[] {
  if (!origin || !hasAccount(origin)) return []
  const lines: string[] = []
  for (const p of origin.parts) {
    if (p.ratio === 1) continue
    lines.push(`${p.label} ${ratioText(p.ratio)}`)
  }
  if (origin.damageBonus > 0) lines.push(`${origin.label} 增伤 +${Math.round(origin.damageBonus * 100)}%`)
  if (origin.damageReduction > 0) lines.push(`${origin.label} 减伤 +${Math.round(origin.damageReduction * 100)}%`)
  if (origin.note) lines.push(origin.note)
  return lines.length > 0 ? lines : [`${origin.label} ${ratioText(origin.ratio)}`]
}

/** 一行读数:「三维 ×1.87(层级补偿 ×1.90 · 危地 ×0.98)」 */
export function foeOriginRow(origin: FoeOrigin): { label: string; value: string } {
  if (!hasAccount(origin)) return { label: '敌之加成', value: '无' }
  const detail = foeOriginPartsText(origin)
  const extras: string[] = []
  if (origin.damageBonus > 0) extras.push(`增伤 +${Math.round(origin.damageBonus * 100)}%`)
  if (origin.damageReduction > 0) extras.push(`减伤 +${Math.round(origin.damageReduction * 100)}%`)
  const head = `三维 ${ratioText(origin.ratio)}${detail ? `(${detail})` : ''}`
  return { label: '敌之加成', value: [head, ...extras].join(' · ') }
}

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
    // 先手放第一行:它决定了整场的节奏,而且是一条**阈值**判定 —— 两个数摆出来,玩家才知道自己差在哪
    ...(result.firstMove ? [firstMoveRow(result)] : []),
    // 敌之加成紧随其后:它解释的是「这一场为什么比上一场难」,与先手同属"战前就定下的数"
    ...(result.foeOrigin ? [foeOriginRow(result.foeOrigin)] : []),
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

/**
 * 先手判定的读数与差额。
 *
 * 一律用**显示出来的那两个数**算差额(先各留两位再相减):显示 1.02 与 1.10 却报「还差 9%」
 * 会让人对着数字算不明白 —— 浮点误差不该出现在玩家读的那句话里。
 */
function firstMoveReadout(result: CombatResult): { playerSpeed: number; enemySpeed: number; gapPct: number; text: string } {
  const f = result.firstMove!
  const playerSpeed = Math.round(f.playerSpeed * 100) / 100
  const enemySpeed = Math.round(f.enemySpeed * 100) / 100
  const gapPct = Math.max(0, Math.round((enemySpeed - playerSpeed) * 100))
  return {
    playerSpeed,
    enemySpeed,
    gapPct,
    text: f.playerFirst
      ? `你抢先 ${playerSpeed.toFixed(2)} ≥ 敌 ${enemySpeed.toFixed(2)}`
      : `敌先动(你 ${playerSpeed.toFixed(2)} < 敌 ${enemySpeed.toFixed(2)})`
  }
}

/** 先手判定的读数行:「你 1.06 ≥ 敌 1.05」比「出手速度 +6%」诚实得多 */
function firstMoveRow(result: CombatResult): { label: string; value: string } {
  return { label: '先手', value: firstMoveReadout(result).text }
}

/**
 * 被抢先时给一条**可行动**的解释:还差多少能跨过对手那一线。
 *
 * 「出手速度 +6%」这种写法会让人以为多打一点就多赚一点;真相是差一点就完全没有。
 * 故这里把差额直接换算成词条还差几个百分点 —— 解释原因、给方向,不替玩家做决定。
 */
function firstMoveFinding(result: CombatResult): AnalysisFinding[] {
  const f = result.firstMove
  if (!f || f.playerFirst) return []
  const { playerSpeed, enemySpeed, gapPct: gap } = firstMoveReadout(result)
  if (gap <= 0) return []
  return [
    {
      text: `先手判定是一条阈值:你 ${playerSpeed.toFixed(2)} < 敌 ${enemySpeed.toFixed(2)},被对手抢了先。先手类词条再凑 ${gap}% 即可跨过这条线(跨过即抢先,不必堆更多)。`,
      styleHints: ['fengmang']
    }
  ]
}

/**
 * 敌人加成的归因 —— 败北时把「它凭什么这么难」摊开讲。
 *
 * 这解释的是**战前就定下的数**,不是临场失手:故与先手判定同列在最前,
 * 且**只在真有加成时出现**(中性判定不占字数,更不该替玩家的败因背锅)。
 */
function foeOriginFinding(result: CombatResult): AnalysisFinding[] {
  const o = result.foeOrigin
  // 只报「敌人占了便宜」的那一半:比该有的还薄是好事,不必占败因的字数
  if (!o || !hasEdge(o)) return []
  const lines = foeOriginLines(o)
  if (lines.length === 0) return []
  return [{ text: `敌之加成(${o.label}):${lines.join(';')}`, styleHints: [] }]
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
  // 被抢先排在最前:它解释的是「整场节奏为什么在对方手里」,比逐项伤害占比更靠前
  const findings = [...foeOriginFinding(result), ...firstMoveFinding(result), ...defeatFindings(p, p.taken, result.rounds)]
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
