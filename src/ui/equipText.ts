/**
 * Next upgrade line for equipment flats.
 * Each level adds EQUIP_LEVEL_BONUS of the naked base, so the gain
 * relative to the stats on screen shrinks as the level rises.
 */
import { EQUIP_LEVEL_BONUS } from '@/data/constants'
import { formatPercent } from '@/utils/format'

export function equipNextLevelText(level: number): string {
  const rel = EQUIP_LEVEL_BONUS / (1 + level * EQUIP_LEVEL_BONUS)
  return `基础属性此刻再涨 ${formatPercent(rel)}(每级相对裸装 +${formatPercent(EQUIP_LEVEL_BONUS)})`
}
