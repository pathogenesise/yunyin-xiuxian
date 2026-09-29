/**
 * 灵脉服务 —— Phase 30.3
 * 投点规则:各脉平级,无主脉/副脉之分;单条可投上限由**效果本身的数值上限**折算
 * (见 data/veins 的 veinEffectCap),没有硬上限的效果(修炼速度、历练遇敌速度)
 * 则只受灵石成本约束。
 */
import type { GNum } from '@/types'
import type { VeinId } from '@/data/veins'
import { INSIGHT_DISCOUNT_PER_POINT, veinDef, veinEffectCap } from '@/data/veins'
import { VEIN_POINT_STONE, VEIN_UNLOCK_MAJOR } from '@/data/constants'
import { stoneByTier } from './formulas'
import { playerTier } from './progress'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'
import { veinPeakToast, veinShortToast } from '@/ui/veinText'

/** 灵脉是否开放(金丹起) */
export function veinsUnlocked(): boolean {
  return usePlayerStore().major >= VEIN_UNLOCK_MAJOR
}

/**
 * 某条脉当前可投上限(点数);null = 没有上限。
 *
 * 上限不是另设的灵脉规则,而是「该脉每点效果 × 点数 ≤ 效果硬上限」直接折算出来的:
 * 炼器脉每点 0.3% 省耗、硬上限六成,即 200 点封顶;修炼速度无硬上限,故不封顶。
 */
export function veinCap(id: VeinId): number | null {
  const per = veinPerPointEffect(id)
  const cap = veinEffectCap(id)
  if (cap === null || per === null || per <= 0) return null
  return Math.floor(cap / per + 1e-9)
}

/** 该脉每点的效果值(悟道脉走参悟折扣通道,其余读 perPoint);读不到则 null */
function veinPerPointEffect(id: VeinId): number | null {
  if (id === 'insight') return INSIGHT_DISCOUNT_PER_POINT
  const def = veinDef(id)
  const keys = Object.keys(def.perPoint) as (keyof typeof def.perPoint)[]
  if (keys.length !== 1) return null
  const v = def.perPoint[keys[0]!]
  return typeof v === 'number' ? v : null
}

/** 单点投资成本(按玩家当前层级) */
export function veinPointCost(): GNum {
  return stoneByTier(playerTier(), VEIN_POINT_STONE)
}

/**
 * 向某条脉投一点。
 * 到了该脉的效果上限就拒绝(上限之上再投不会多出任何数值)。
 */
export function investVein(id: VeinId): boolean {
  const dongfu = useDongfuStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  if (!veinsUnlocked()) return false

  const current = dongfu.veinPoints[id] ?? 0
  const cap = veinCap(id)
  if (cap !== null && current >= cap) {
    ui.toast(veinPeakToast(veinDef(id).name), 'warn')
    return false
  }
  const cost = veinPointCost()
  if (!resources.hasStone(cost)) {
    ui.toast(veinShortToast(), 'warn')
    return false
  }
  resources.spendStone(cost)
  dongfu.addVeinPoint(id, 1)
  return true
}
