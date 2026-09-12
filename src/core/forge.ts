/**
 * 炼器服务 —— 强化 / 分解 / 法宝升阶
 */
import type { EquipmentInstance, GNum } from '@/types'
import { qualityDef } from '@/data/qualities'
import { equipmentTemplate } from '@/data/equipment'
import { artifactDef, ARTIFACT_MAX_LEVEL, ARTIFACT_UP_STONE_TIER, ARTIFACT_UP_WUDAO_BASE } from '@/data/artifacts'
import { EQUIP_MAX_LEVEL_BASE } from '@/data/constants'
import { stoneByTier, upgradeCost } from './formulas'
import { add, gnZero, isZero } from '@/utils/gnum'
import { formatGN } from '@/utils/format'
import { salvageOf } from './salvage'
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
  // 记账:这件装备花掉的强化成本(分解时按八成返还)——折扣是当时的,只有账本记得住
  const invested = inst.invested ?? { dust: 0, stone: gnZero() }
  inventory.replaceItem({
    ...inst,
    level: inst.level + 1,
    invested: { dust: invested.dust + cost.dust, stone: add(invested.stone, cost.stone) }
  })
  track('upgrades')
  const t = equipmentTemplate(inst.templateId)
  ui.toast(`「${t?.name}」强化至 +${inst.level + 1}`, 'success')
  return true
}

export function decomposeEquipment(uid: string, opts: { quiet?: boolean } = {}): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst || inst.locked) return false
  const gain = salvageOf(inst)
  inventory.removeEquipment(uid)
  resources.addSmall('dust', gain.dust)
  resources.addStone(gain.stone)
  track('decomposed')
  if (!opts.quiet) {
    ui.toast(
      isZero(gain.stone)
        ? `分解得器灵尘×${gain.dust}`
        : `分解得器灵尘×${gain.dust} · 退灵石 ${formatGN(gain.stone)}(含强化八成)`,
      'info'
    )
  }
  return true
}

export interface DecomposeBatch {
  count: number
  dust: number
  stone: GNum
}

/** 批量分解的账目文案:批量路径只有这一处措辞,免得各写各的 */
export function batchYieldText(b: DecomposeBatch): string {
  return isZero(b.stone) ? `得器灵尘×${b.dust}` : `得器灵尘×${b.dust} · 退灵石 ${formatGN(b.stone)}`
}

/**
 * 批量分解:逐件结算、**不逐件弹提示** —— 提示窗只留最近 5 条,
 * 逐件弹会把「一共拆了多少、拿回多少」的总账顶掉。调用方自己按总量报一次。
 */
export function decomposeBatch(items: readonly EquipmentInstance[]): DecomposeBatch {
  const total: DecomposeBatch = { count: 0, dust: 0, stone: gnZero() }
  for (const it of items) {
    if (!decomposeEquipment(it.uid, { quiet: true })) continue
    const gain = salvageOf(it)
    total.count += 1
    total.dust += gain.dust
    total.stone = add(total.stone, gain.stone)
  }
  return total
}

/** 行囊中勾选品质的未锁定装备(预告与下手用同一套筛选,所见即所得) */
function decomposeTargets(ranks: readonly number[]): EquipmentInstance[] {
  const wanted = new Set(ranks)
  return useInventoryStore().bagItems.filter(it => !it.locked && wanted.has(qualityDef(it.quality).rank))
}

/** 分解预告:会拆几件、拿回什么 —— 弹窗上写的数就是真下手的数 */
export function decomposePreview(ranks: readonly number[]): DecomposeBatch {
  const total: DecomposeBatch = { count: 0, dust: 0, stone: gnZero() }
  for (const it of decomposeTargets(ranks)) {
    const gain = salvageOf(it)
    total.count += 1
    total.dust += gain.dust
    total.stone = add(total.stone, gain.stone)
  }
  return total
}

/** 一键分解:行囊中勾选品质 rank 的未锁定装备,按一次总账报出来,返回分解件数 */
export function decomposeByRanks(ranks: readonly number[]): number {
  const ui = useUiStore()
  const got = decomposeBatch(decomposeTargets(ranks))
  if (got.count > 0) ui.toast(`已分解 ${got.count} 件装备,${batchYieldText(got)}`, 'info')
  return got.count
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
