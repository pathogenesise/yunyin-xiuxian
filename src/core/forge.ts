/**
 * 炼器服务 —— 强化 / 分解 / 法宝升阶
 */
import type { GNum } from '@/types'
import { qualityDef } from '@/data/qualities'
import { equipmentTemplate } from '@/data/equipment'
import { artifactDef, ARTIFACT_MAX_LEVEL, ARTIFACT_UP_STONE_TIER, ARTIFACT_UP_WUDAO_BASE } from '@/data/artifacts'
import { DECOMPOSE_DUST, EQUIP_MAX_LEVEL_BASE } from '@/data/constants'
import { stoneByTier, upgradeCost } from './formulas'
import { modOf } from './statsCalc'
import { track } from './progress'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useInventoryStore } from '@/stores/inventory'
import { useDongfuStore } from '@/stores/dongfu'
import { useUiStore } from '@/stores/ui'

export function equipLevelCap(): number {
  return EQUIP_MAX_LEVEL_BASE + useDongfuStore().forgeCapBonus
}

export function equipUpgradeCost(uid: string): { dust: number; stone: GNum } | null {
  const inventory = useInventoryStore()
  const player = usePlayerStore()
  const inst = inventory.findItem(uid)
  if (!inst || inst.level >= equipLevelCap()) return null
  const q = qualityDef(inst.quality)
  return upgradeCost(inst.level, inst.tier, q.rank, modOf(player.finalStats.mods, 'forgeDiscount'))
}

export function upgradeEquipment(uid: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  const cost = equipUpgradeCost(uid)
  if (!inst || !cost) {
    ui.toast('已达强化上限', 'warn')
    return false
  }
  if (!resources.hasSmall('dust', cost.dust) || !resources.hasStone(cost.stone)) {
    ui.toast('器灵尘或灵石不足', 'warn')
    return false
  }
  resources.spendSmall('dust', cost.dust)
  resources.spendStone(cost.stone)
  inventory.replaceItem({ ...inst, level: inst.level + 1 })
  track('upgrades')
  const t = equipmentTemplate(inst.templateId)
  ui.toast(`「${t?.name}」强化至 +${inst.level + 1}`, 'success')
  return true
}

export function decomposeEquipment(uid: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst || inst.locked) return false
  const q = qualityDef(inst.quality)
  const dust = (DECOMPOSE_DUST[q.rank] ?? 1) + Math.floor(inst.level / 2)
  inventory.removeEquipment(uid)
  resources.addSmall('dust', dust)
  track('decomposed')
  ui.toast(`分解得器灵尘×${dust}`, 'info')
  return true
}

/** 一键分解:行囊中勾选品质 rank 的未锁定装备,返回分解件数 */
export function decomposeByRanks(ranks: readonly number[]): number {
  const inventory = useInventoryStore()
  const wanted = new Set(ranks)
  const targets = inventory.bagItems.filter(it => !it.locked && wanted.has(qualityDef(it.quality).rank))
  let count = 0
  for (const it of targets) {
    if (decomposeEquipment(it.uid)) count += 1
  }
  return count
}

export function artifactUpCost(defId: string): { wudao: number; stone: GNum } | null {
  const inventory = useInventoryStore()
  const owned = inventory.artifacts.find(a => a.defId === defId)
  const def = artifactDef(defId)
  if (!owned || !def || owned.level >= ARTIFACT_MAX_LEVEL) return null
  return {
    wudao: Math.ceil(ARTIFACT_UP_WUDAO_BASE * Math.pow(1.6, owned.level) * (1 + qualityDef(def.quality).rank * 0.3)),
    stone: stoneByTier(def.minTier, ARTIFACT_UP_STONE_TIER * (1 + owned.level))
  }
}

export function upgradeArtifact(defId: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const cost = artifactUpCost(defId)
  const def = artifactDef(defId)
  if (!cost || !def) {
    ui.toast('此法宝已臻圆满', 'warn')
    return false
  }
  if (!resources.hasSmall('wudao', cost.wudao) || !resources.hasStone(cost.stone)) {
    ui.toast('悟道点或灵石不足', 'warn')
    return false
  }
  resources.spendSmall('wudao', cost.wudao)
  resources.spendStone(cost.stone)
  inventory.levelUpArtifact(defId)
  ui.toast(`「${def.name}」炼化精进`, 'success')
  return true
}
