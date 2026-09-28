/**
 * 装备重铸与词条锁定
 *
 * 灵石的长期 sink,直接连接 Build:
 * - **重铸**:把**未锁定**的词条推倒重来 —— 条数按品质区间重掷(锁定数为保底),
 *   数值全部重掷;品质、阶数、强化等级都不动。**不限次数**。
 * - **锁定**:付费锁定一个词条,重铸不会碰它;再点一次即可解锁(不再退灵石)。
 *
 * **何时洗不动**:锁定数达到该品质的词条条数上限为止。锁定只是保护,不是封禁 ——
 * 上限 7 条的装备锁了 6 条,第 7 条还没锁,就仍可继续重掷那一条。
 *
 * 成本只与**装备阶数**和**锁定数**挂钩(见 data/constants 的注释):
 * 想保住好词条就得付溢价 —— 「洗得越多越贵」由「你保护了多少」表达,
 * 而不是由一个与装备无关的次数计数器表达。
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
  REFORGE_SEAL_LOAD,
  REFORGE_STONE_BASE,
  SEAL_STONE_BASE
} from '@/data/constants'
import { stoneByTier } from './formulas'
import { track } from './progress'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'
import {
  reforgeDoneToast,
  reforgeEmptyToast,
  reforgeLockedNote,
  reforgeShortToast,
  lockDoneToast,
  lockShortToast,
  unlockDoneToast
} from '@/ui/reforgeText'

export interface ReforgeCost {
  stone: GNum
  dust: number
}

/**
 * 装备的词条条数上限 —— 唯一口径,重铸判据与界面读数都走它。
 * 取品质区间的上界(qualities 里的规则:上限 = rank + 1)。
 */
export function reforgeAffixCap(inst: EquipmentInstance): number {
  return qualityDef(inst.quality).affixes[1]
}

/**
 * 重铸成本:灵石 = stoneByTier(阶数) × (1 + 锁定数 × REFORGE_SEAL_LOAD);
 * 器灵尘 = REFORGE_DUST_BASE × (1 + 锁定数)。
 *
 * 没有次数项,也没有上限:同一件、同一锁定数,第一次与第两百次一个价。
 *
 * 何时不能再炼:**锁定数已达该品质的词条条数上限**。
 * 这不是「还有没有未锁定的词条」——锁定是保护,不是封禁。一件天品上限 7 条,
 * 锁了 6 条、另 1 条是上次重掷出来还没锁的,就该还能接着洗(玩家最自然的一句疑问
 * 就是这个);只有把 7 条全锁满,才真的洗不动了。
 */
export function reforgeCost(inst: EquipmentInstance): ReforgeCost | null {
  if ((inst.sealedAffixIds ?? []).length >= reforgeAffixCap(inst)) return null
  const locked = (inst.sealedAffixIds ?? []).length
  const load = 1 + locked * REFORGE_SEAL_LOAD
  return {
    stone: stoneByTier(inst.tier, REFORGE_STONE_BASE * load),
    dust: Math.round(REFORGE_DUST_BASE * load)
  }
}

/**
 * 锁定一条词条(或解锁它):再点一次即解除锁定,不退灵石。
 *
 * 与旧「封存」的两处差别:
 *   · **可解除** —— 封存是单向的,锁错了只能带着它;
 *   · **不强制留一个可重掷位** —— 旧规则要求「至少留一条可重掷」,
 *     于是「6 条词条锁 3 条 → 重铸后总数掉到 4 条」时第 4 条再也锁不上
 *     (可重掷位被重铸的最低条数挤掉了),玩家看着自己锁好的三条旁边空着一条却动不了。
 *     现在全部锁住只是「这一件不能再重铸」,那本来就是合法的终局状态。
 */
export function toggleAffixLock(uid: string, affixId: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst) return false
  if (!inst.affixes.some(a => a.id === affixId)) return false

  const locked = inst.sealedAffixIds ?? []
  if (locked.includes(affixId)) {
    // 解除:不花钱,只把这条放回重铸的池子里
    inventory.replaceItem({ ...inst, sealedAffixIds: locked.filter(id => id !== affixId) })
    ui.toast(unlockDoneToast(affixDef(affixId)?.name ?? '词条'), 'info')
    return true
  }

  const cost = lockCost(inst)
  if (!resources.hasStone(cost)) {
    ui.toast(lockShortToast(), 'warn')
    return false
  }
  resources.spendStone(cost)
  inventory.replaceItem({ ...inst, sealedAffixIds: [...locked, affixId] })
  const name = affixDef(affixId)?.name ?? '词条'
  ui.toast(lockDoneToast(name), 'success')
  return true
}

/** 锁定成本:第 n 条锁定的灵石 = 基础 × n(按装备层级换算) */
export function lockCost(inst: EquipmentInstance): GNum {
  const locked = inst.sealedAffixIds ?? []
  return stoneByTier(inst.tier, SEAL_STONE_BASE * (locked.length + 1))
}

/** 还能再锁几条(界面上「还能锁」用;不设留位,故恒为剩余条数) */
export function lockCapacity(inst: EquipmentInstance): number {
  return Math.max(0, inst.affixes.length - (inst.sealedAffixIds ?? []).length)
}

/**
 * 重铸:把未锁定的词条全部推倒重来。
 *
 * 「重铸」此前是**换掉一条**词条,条数不动 —— 而一件 3 条的凡品与一件 6 条的神品,
 * 差的从来不只是数值,是**能凑出几种搭配**。所以重铸要连条数一起重掷:
 *   新条数 = 品质区间内随机,但不少于「锁定数 + 1」(每次重铸都至少给你一条新的);
 *   锁定的原样留着,其余全部换成新词条、新掷点。
 * 品质、阶数、强化等级一概不动 —— 重铸的是一件的「词条构成」,不是它的出身。
 */
export function reforgeEquipment(uid: string): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst) return false
  const cost = reforgeCost(inst)
  if (!cost) {
    ui.toast(reforgeEmptyToast(), 'warn')
    return false
  }
  if (!resources.hasStone(cost.stone) || !resources.hasSmall('dust', cost.dust)) {
    ui.toast(reforgeShortToast(), 'warn')
    return false
  }

  const template = equipmentTemplate(inst.templateId)
  const quality = qualityDef(inst.quality)
  const locked = new Set(inst.sealedAffixIds ?? [])
  const kept = inst.affixes.filter(a => locked.has(a.id))
  const [minCount, maxCount] = quality.affixes

  resources.spendStone(cost.stone)
  resources.spendSmall('dust', cost.dust)

  // 条数:品质区间内重掷,但以「锁定数」保底 —— 锁住的几条永远不会被掷掉。
  // 注意这里**不**再 +1 抬下限:「锁定数 + 1」是旧判据(全锁即禁洗)的配套物,
  // 用来保证「每次至少有一条新的可洗」。判据换成「锁定数 < 品质上限」之后,
  // 若还按锁定数 + 1 掷,天品锁 6 条会被强制掷到 7 条 —— 于是每次点重铸必涨一条,
  // 涨满上限 7 就再也不能洗(7 < 7 为假),玩家平白丢掉了「维持 6 条只换数值」的能力。
  const wantCount = Math.max(kept.length, Math.min(maxCount, rng.int(minCount, maxCount)))
  const used = new Set([...kept.map(a => a.id)])
  const fresh: { id: string; roll: number }[] = []
  let guard = 0
  while (fresh.length < wantCount - kept.length && guard < 50) {
    guard += 1
    const pool = AFFIXES.filter(
      a =>
        !used.has(a.id) &&
        (a.minRank === undefined || quality.rank >= a.minRank) &&
        (a.slots === undefined || template === undefined || a.slots.includes(template.slot))
    )
    if (pool.length === 0) break
    const picked = rng.weighted(pool, a => a.weight)
    used.add(picked.id)
    fresh.push({ id: picked.id, roll: rng.next() })
  }
  const affixes = [...kept, ...fresh]
  const before = inst.affixes.length
  inventory.replaceItem({ ...inst, affixes, reforgeCount: (inst.reforgeCount ?? 0) + 1 })
  track('upgrades')

  const lockedNote = reforgeLockedNote(kept.length)
  const countNote = before === affixes.length ? `${affixes.length} 条` : `${before} → ${affixes.length} 条`
  ui.toast(reforgeDoneToast(countNote, lockedNote), 'success')
  return true
}
