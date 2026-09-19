/**
 * 灵脉效果行 —— 数字只从 perPoint / INSIGHT_DISCOUNT_PER_POINT 现算。
 *
 * 手写「p * 0.4」会在改每点加成那天变成谎话;「炼丹双成率」「炼器耗材」
 * 又和当前加成栏的词条名不是一套,同一张卡上左右对不上。
 */
import type { AnyStatKey } from '@/types'
import { formatPercent } from '@/utils/format'
import { INSIGHT_DISCOUNT_PER_POINT, INSIGHT_EFFECT_NAME, type VeinDef } from '@/data/veins'
import { STAT_NAMES } from './statNames'

export function veinEffectText(def: VeinDef, points: number): string {
  const parts: string[] = []
  for (const [k, raw] of Object.entries(def.perPoint)) {
    if (typeof raw !== 'number' || raw === 0) continue
    const n = raw * points
    const pct = formatPercent(Math.abs(n))
    parts.push(`${STAT_NAMES[k as AnyStatKey] ?? k} ${n > 0 ? '+' : '-'}${pct}`)
  }
  if (def.id === 'insight') {
    parts.push(`${INSIGHT_EFFECT_NAME} −${formatPercent(points * INSIGHT_DISCOUNT_PER_POINT)}`)
  }
  return parts.join(' · ')
}
