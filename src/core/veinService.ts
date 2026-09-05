/**
 * 灵脉服务 —— Phase 30.3
 * 投点规则:总容量 100;主脉独占 70;副脉各 ≤30。
 * 主脉可迁移(付费换向),已投点数不回收——方向选择有代价但不锁死。
 */
import type { GNum } from '@/types'
import type { VeinId } from '@/data/veins'
import { veinDef } from '@/data/veins'
import { VEIN_MAIN_CAPACITY, VEIN_POINT_STONE, VEIN_SIDE_CAP, VEIN_TOTAL_CAPACITY, VEIN_UNLOCK_MAJOR } from '@/data/constants'
import { stoneByTier } from './formulas'
import { playerTier } from './progress'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'

/** 灵脉是否开放(金丹起) */
export function veinsUnlocked(): boolean {
  return usePlayerStore().major >= VEIN_UNLOCK_MAJOR
}

/** 某条脉当前可投上限 */
export function veinCap(id: VeinId): number {
  const dongfu = useDongfuStore()
  return dongfu.veinMain === id ? VEIN_MAIN_CAPACITY : VEIN_SIDE_CAP
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

  if (dongfu.veinTotal >= VEIN_TOTAL_CAPACITY) {
    ui.toast('灵脉容量已尽,唯有取舍', 'warn')
    return false
  }
  if (dongfu.veinMain === null) dongfu.setVeinMain(id)
  const current = dongfu.veinPoints[id] ?? 0
  if (current >= veinCap(id)) {
    ui.toast(dongfu.veinMain === id ? '主脉已至圆满' : '副脉有其上限,欲再进须立为主脉', 'warn')
    return false
  }
  const cost = veinPointCost()
  if (!resources.hasStone(cost)) {
    ui.toast('灵石不足', 'warn')
    return false
  }
  resources.spendStone(cost)
  dongfu.addVeinPoint(id, 1)
  return true
}

/** 迁移主脉:付费换向;原主脉点数保留(超出副脉上限的部分不再可投,但效果不失) */
export function switchMainVein(id: VeinId): boolean {
  const dongfu = useDongfuStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  if (!veinsUnlocked() || dongfu.veinMain === id) return false
  const cost = veinSwitchCost()
  if (!resources.hasStone(cost)) {
    ui.toast('灵石不足,迁脉非小事', 'warn')
    return false
  }
  resources.spendStone(cost)
  dongfu.setVeinMain(id)
  ui.toast(`主脉改走「${veinDef(id).name}」`, 'success')
  return true
}
