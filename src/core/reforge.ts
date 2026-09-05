/**
 * 装备重铸与词条封存 —— Phase 30.1
 *
 * 灵石的长期 sink,直接连接 Build:
 * - 重铸:保留品质与基础数值,重新随机一个未封存词条;成本按次数指数增长,上限 10 次
 * - 封存:付费永久锁定一个词条,重铸不会将其替换;至少留一个可随机位
 *
 * 原则:不为消耗而消耗——每一笔花销都在改变构筑,而非购买数值。
 */
import type { EquipmentInstance, GNum } from '@/types'
import { rng } from '@/utils/random'
import { AFFIXES, affixDef } from '@/data/affixes'
import { equipmentTemplate } from '@/data/equipment'
import { qualityDef } from '@/data/qualities'
import {
  REFORGE_DUST_BASE,
  REFORGE_DUST_STEP,
  REFORGE_MAX_COUNT,
  REFORGE_STONE_BASE,
  SEAL_STONE_BASE
} from '@/data/constants'
import { stoneByTier } from './formulas'
import { track } from './progress'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'

export interface ReforgeCost {
  stone: GNum
  dust: number
}

/**
 * 重铸成本:灵石递增公式 = 基础 × 品质系数 × 次数指数 × 封存稀有度系数
 * - 品质系数:从 qualityDef 获取 mult 字段(凡1.0 → 神9.5)
 * - 次数指数:1.5^count (第10次=57.67倍)
 * - 封存稀有度系数:[普通1.0, 稀有1.5, 史诗2.0, 传说3.0]
 * 达上限或无可重铸词条返回 null
 */
export function reforgeCost(inst: EquipmentInstance): ReforgeCost | null {
  const count = inst.reforgeCount ?? 0
  if (count >= REFORGE_MAX_COUNT) return null
  if (reforgeableAffixIds(inst).length === 0) return null

  // 品质系数:使用实际品质定义的 mult
  const qualityMult = qualityDef(inst.quality).mult

  // 次数指数(1.5^count,避免前期过贵 + 10次后暴涨)
  const rerollMult = Math.pow(1.5, count)

  // 封存稀有度系数:取所有封存词条中最高稀有度
  let lockedRarityMult = 1.0
  if (inst.sealedAffixIds && inst.sealedAffixIds.length > 0) {
    const rarityWeights = { common: 1.0, rare: 1.5, epic: 2.0, legendary: 3.0 }
    for (const affixId of inst.sealedAffixIds) {
      const def = affixDef(affixId)
      if (def) {
        const w = rarityWeights[def.rarity] ?? 1.0
        if (w > lockedRarityMult) lockedRarityMult = w
      }
    }
  }

  const finalMult = qualityMult * rerollMult * lockedRarityMult

  return {
    stone: stoneByTier(inst.tier, REFORGE_STONE_BASE * finalMult),
    dust: REFORGE_DUST_BASE + count * REFORGE_DUST_STEP
  }
}

/** 可被重铸(未封存)的词条 id 列表 */
export function reforgeableAffixIds(inst: EquipmentInstance): string[] {
  const sealed = new Set(inst.sealedAffixIds ?? [])
  return inst.affixes.map(a => a.id).filter(id => !sealed.has(id))
}

/**
 * 重铸:随机替换一个未封存词条(换成装备上没有的新词条,数值重掷)。
 * 保留品质/层级/强化等级,只动词条。
 */
export function reforgeEquipment(uid: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst) return false
  const cost = reforgeCost(inst)
  if (!cost) {
    ui.toast('此物已无重铸余地', 'warn')
    return false
  }
  if (!resources.hasStone(cost.stone) || !resources.hasSmall('dust', cost.dust)) {
    ui.toast('灵石或器灵尘不足', 'warn')
    return false
  }

  const template = equipmentTemplate(inst.templateId)
  const quality = qualityDef(inst.quality)
  const candidates = reforgeableAffixIds(inst)
  const targetId = rng.pick(candidates)
  const existing = new Set(inst.affixes.map(a => a.id))
  const pool = AFFIXES.filter(
    a =>
      !existing.has(a.id) &&
      (a.minRank === undefined || quality.rank >= a.minRank) &&
      (a.slots === undefined || template === undefined || a.slots.includes(template.slot))
  )
  if (pool.length === 0) {
    ui.toast('天地词条已尽,无可替换', 'warn')
    return false
  }

  resources.spendStone(cost.stone)
  resources.spendSmall('dust', cost.dust)
  const picked = rng.weighted(pool, a => a.weight)
  const newAffixes = inst.affixes.map(a => (a.id === targetId ? { id: picked.id, roll: rng.next() } : a))
  inventory.replaceItem({ ...inst, affixes: newAffixes, reforgeCount: (inst.reforgeCount ?? 0) + 1 })
  track('upgrades')

  const oldName = affixDef(targetId)?.name ?? '旧词条'
  ui.toast(`重铸而成:「${oldName}」化作「${picked.name}」`, 'success')
  return true
}

/** 封存成本:第 n 次封存 = 基础 × n(灵石按装备层级换算) */
export function sealCost(inst: EquipmentInstance): GNum | null {
  const sealed = inst.sealedAffixIds ?? []
  // 至少留一个可随机位,封满则不可再封
  if (sealed.length >= Math.max(0, inst.affixes.length - 1)) return null
  return stoneByTier(inst.tier, SEAL_STONE_BASE * (sealed.length + 1))
}

/** 封存一个词条:重铸永不替换之 */
export function sealAffix(uid: string, affixId: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst) return false
  if (!inst.affixes.some(a => a.id === affixId)) return false
  if ((inst.sealedAffixIds ?? []).includes(affixId)) return false
  const cost = sealCost(inst)
  if (!cost) {
    ui.toast('至少须留一个词条随天意流转', 'warn')
    return false
  }
  if (!resources.hasStone(cost)) {
    ui.toast('灵石不足', 'warn')
    return false
  }
  resources.spendStone(cost)
  inventory.replaceItem({ ...inst, sealedAffixIds: [...(inst.sealedAffixIds ?? []), affixId] })
  const name = affixDef(affixId)?.name ?? '词条'
  ui.toast(`「${name}」已封存,重铸不移`, 'success')
  return true
}
