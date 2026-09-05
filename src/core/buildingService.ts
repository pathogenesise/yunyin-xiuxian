/**
 * 洞府建筑服务 —— 升级
 */
import type { BuildingId, GNum } from '@/types'
import { buildingDef } from '@/data/buildings'
import { buildingCost } from './formulas'
import { track } from './progress'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useDongfuStore } from '@/stores/dongfu'
import { useUiStore } from '@/stores/ui'

export interface BuildingUpgradeInfo {
  canUpgrade: boolean
  reason: string
  stone: GNum
  ore: number
  nextLevel: number
}

export function buildingUpgradeInfo(id: BuildingId): BuildingUpgradeInfo {
  const dongfu = useDongfuStore()
  const player = usePlayerStore()
  const def = buildingDef(id)!
  const lv = dongfu.levels[id] ?? 0
  const stone = buildingCost(def.costBase, lv)
  const ore = def.costOre * (lv + 1)
  let canUpgrade = true
  let reason = ''
  if (player.major < def.unlockRealm) {
    canUpgrade = false
    reason = `需 ${['炼气', '筑基', '金丹'][def.unlockRealm] ?? '更高'} 境`
  } else if (lv >= def.maxLevel) {
    canUpgrade = false
    reason = '已至顶层'
  } else if (id !== 'mansion' && lv >= dongfu.buildingLevelCap) {
    canUpgrade = false
    reason = '受洞府等级所限'
  }
  return { canUpgrade, reason, stone, ore, nextLevel: lv + 1 }
}

export function upgradeBuilding(id: BuildingId): boolean {
  const dongfu = useDongfuStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const def = buildingDef(id)!
  const info = buildingUpgradeInfo(id)
  if (!info.canUpgrade) {
    ui.toast(info.reason, 'warn')
    return false
  }
  if (!resources.hasStone(info.stone) || !resources.hasSmall('ore', info.ore)) {
    ui.toast('灵石或玄铁不足', 'warn')
    return false
  }
  resources.spendStone(info.stone)
  resources.spendSmall('ore', info.ore)
  dongfu.setLevel(id, info.nextLevel)
  track('buildingUpgrades')
  ui.toast(`${def.name}升至 ${info.nextLevel} 级`, 'success')
  return true
}
