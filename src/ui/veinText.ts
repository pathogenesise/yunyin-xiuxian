/**
 * 灵脉效果行 —— 数字只从 perPoint / INSIGHT_DISCOUNT_PER_POINT 与效果上限现算。
 *
 * 手写「p * 0.4」会在改每点加成那天变成谎话;「炼丹双成率」「炼器耗材」
 * 又和当前加成栏的词条名不是一套,同一张卡上左右对不上。
 *
 * 超出效果上限的那部分**不计数值**:投点仍可继续(灵石已花),
 * 但面板、实际效果与这一行读数都停在上限那条线上。
 */
import { formatPercent } from '@/utils/format'
import {
  INSIGHT_DISCOUNT_PER_POINT,
  INSIGHT_EFFECT_NAME,
  VEIN_EFFECT_CAPS,
  veinDef,
  type VeinDef
} from '@/data/veins'
import { modsText } from './statNames'

/**
 * 某条脉在 given 点数下**真正生效**的点数:封顶在效果上限那条线上。
 * 无上限的效果原样返回。
 */
export function effectiveVeinPoints(id: VeinDef['id'], points: number): number {
  const def = veinDef(id)
  if (def.capKey === null) return points
  const cap = VEIN_EFFECT_CAPS[def.capKey]
  const per = id === 'insight' ? INSIGHT_DISCOUNT_PER_POINT : perPointValue(def)
  if (per === null || per <= 0) return points
  const maxPoints = Math.floor(cap / per + 1e-9)
  return Math.min(points, maxPoints)
}

/** 一条脉每点的效果值(perPoint 只有一个键时读它) */
function perPointValue(def: VeinDef): number | null {
  const keys = Object.keys(def.perPoint) as (keyof typeof def.perPoint)[]
  if (keys.length !== 1) return null
  const v = def.perPoint[keys[0]!]
  return typeof v === 'number' ? v : null
}

export function veinEffectText(def: VeinDef, points: number): string {
  const eff = effectiveVeinPoints(def.id, points)
  const scaled: Record<string, number> = {}
  for (const [k, raw] of Object.entries(def.perPoint)) {
    if (typeof raw !== 'number' || raw === 0) continue
    scaled[k] = raw * eff
  }
  const parts: string[] = []
  const mods = modsText(scaled)
  if (mods) parts.push(mods)
  if (def.id === 'insight') {
    parts.push(`${INSIGHT_EFFECT_NAME} −${formatPercent(eff * INSIGHT_DISCOUNT_PER_POINT)}`)
  }
  return parts.join(' · ')
}

export function veinPeakToast(veinName = '此脉'): string {
  return `「${veinName}」已至此效之极,再投亦不再增`
}

export function veinShortToast(): string {
  return '灵石未足,难注此脉'
}
