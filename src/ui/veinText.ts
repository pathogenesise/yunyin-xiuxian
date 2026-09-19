/**
 * 灵脉效果行 —— 数字只从 perPoint / INSIGHT_DISCOUNT_PER_POINT 现算。
 *
 * 手写「p * 0.4」会在改每点加成那天变成谎话;「炼丹双成率」「炼器耗材」
 * 又和当前加成栏的词条名不是一套,同一张卡上左右对不上。
 */
import { formatPercent } from '@/utils/format'
import { INSIGHT_DISCOUNT_PER_POINT, INSIGHT_EFFECT_NAME, type VeinDef } from '@/data/veins'
import { modsText } from './statNames'

export function veinEffectText(def: VeinDef, points: number): string {
  const scaled: Record<string, number> = {}
  for (const [k, raw] of Object.entries(def.perPoint)) {
    if (typeof raw !== 'number' || raw === 0) continue
    scaled[k] = raw * points
  }
  const parts: string[] = []
  const mods = modsText(scaled)
  if (mods) parts.push(mods)
  if (def.id === 'insight') {
    parts.push(`${INSIGHT_EFFECT_NAME} −${formatPercent(points * INSIGHT_DISCOUNT_PER_POINT)}`)
  }
  return parts.join(' · ')
}
