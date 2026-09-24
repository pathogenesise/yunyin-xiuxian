/**
 * 灵脉服务 —— Phase 30.3
 * 投点规则:无总容量上限;主脉独占 70;副脉不设单条上限。
 * 主脉可迁移(付费换向),已投点数不回收——方向选择有代价但不锁死。
 */
import type { GNum } from '@/types'
import type { VeinId } from '@/data/veins'
import { veinDef } from '@/data/veins'
import { VEIN_MAIN_CAPACITY, VEIN_POINT_STONE, VEIN_UNLOCK_MAJOR } from '@/data/constants'
import { stoneByTier } from './formulas'
import { playerTier } from './progress'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'
import {
  veinPeakToast,
  veinShortToast,
  veinSwitchDoneToast,
  veinSwitchShortToast
} from '@/ui/veinText'

/** 灵脉是否开放(金丹起) */
export function veinsUnlocked(): boolean {
  return usePlayerStore().major >= VEIN_UNLOCK_MAJOR
}

/** 某条脉当前可投上限:主脉 70 点,副脉不限 */
export function veinCap(id: VeinId): number | null {
  const dongfu = useDongfuStore()
  return dongfu.veinMain === id ? VEIN_MAIN_CAPACITY : null
}

/** 单点投资成本(按玩家当前层级) */
export function veinPointCost(): GNum {
  return stoneByTier(playerTier(), VEIN_POINT_STONE)
}

/** 主脉迁移费 */
export function veinSwitchCost(): GNum {
  return stoneByTier(playerTier(), VEIN_POINT_STONE * 20)
}

/**
 * 向某条脉投一点。
 * 未定主脉时,首次投点的脉自动成为主脉。
 */
export function investVein(id: VeinId): boolean {
  const dongfu = useDongfuStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  if (!veinsUnlocked()) return false

  if (dongfu.veinMain === null) dongfu.setVeinMain(id)
  const current = dongfu.veinPoints[id] ?? 0
  const cap = veinCap(id)
  if (cap !== null && current >= cap) {
    ui.toast(veinPeakToast(), 'warn')
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

/** 迁移主脉:付费换向;原主脉点数保留,副脉不设单条上限 */
export function switchMainVein(id: VeinId): boolean {
  const dongfu = useDongfuStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  if (!veinsUnlocked() || dongfu.veinMain === id) return false
  const cost = veinSwitchCost()
  if (!resources.hasStone(cost)) {
    ui.toast(veinSwitchShortToast(), 'warn')
    return false
  }
  resources.spendStone(cost)
  dongfu.setVeinMain(id)
  ui.toast(veinSwitchDoneToast(veinDef(id).name), 'success')
  return true
}
