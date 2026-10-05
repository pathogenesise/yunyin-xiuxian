/**
 * 装备重铸与词条锁定
 *
 * 灵石的长期 sink,直接连接 Build:
 * - **重铸**:把**未锁定**的词条推倒重来 —— 条数按品质区间重掷,
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
import { playSfx } from './audio'
import { AFFIXES, affixDef, affixFitBlock } from '@/data/affixes'
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
import { noteSmithingUsed } from './loreService'
import { add, gnZero } from '@/utils/gnum'
import { useInventoryStore } from '@/stores/inventory'
import { useLoreStore } from '@/stores/lore'
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
 * 锁了 6 条、另 1 条是上次重掷出来还没锁的,就该还能接着洗;只有把 7 条全锁满,
 * 才真的洗不动了。
 * 模板缺失(只可能是坏档)也返回 null:抽取池要按部位过滤,不知部位就不洗 ——
 * 与自动重铸候选在模板缺失时为空同判,界面不出重铸钮、服务也不洗。
 */
export function reforgeCost(inst: EquipmentInstance): ReforgeCost | null {
  if (!equipmentTemplate(inst.templateId)) return null
  if ((inst.sealedAffixIds ?? []).length >= reforgeAffixCap(inst)) return null
  const locked = (inst.sealedAffixIds ?? []).length
  const load = 1 + locked * REFORGE_SEAL_LOAD
  return {
    stone: stoneByTier(inst.tier, REFORGE_STONE_BASE * load),
    dust: Math.round(REFORGE_DUST_BASE * load)
  }
}

/** 可被重铸(未锁定)的词条 id 列表 */
export function reforgeableAffixIds(inst: EquipmentInstance): string[] {
  const sealed = new Set(inst.sealedAffixIds ?? [])
  return inst.affixes.map(a => a.id).filter(id => !sealed.has(id))
}

/**
 * 重铸:把未锁定的词条全部推倒重来。
 *
 * 「重铸」此前是**换掉一条**词条,条数不动 —— 而一件 3 条的凡品与一件 6 条的神品,
 * 差的从来不只是数值,是**能凑出几种搭配**。所以重铸要连条数一起重掷:
 *   新条数 = 品质区间内随机,但不少于「锁定数」(锁住的几条永远不会被掷掉);
 *   锁定的原样留着,其余全部换成新词条、新掷点。
 * 品质、阶数、强化等级一概不动 —— 重铸的是一件的「词条构成」,不是它的出身。
 */
/**
 * 重铸一键(quiet=true 供自动重铸用:逐次洗照常结算,提示由自动那层合为一次)。
 */
export function reforgeEquipment(uid: string, quiet = false): boolean {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const inst = inventory.findItem(uid)
  if (!inst) return false
  const cost = reforgeCost(inst)
  if (!cost) {
    if (!quiet) {
      playSfx('warn')
      ui.toast(reforgeEmptyToast(), 'warn')
    }
    return false
  }
  if (!resources.hasStone(cost.stone) || !resources.hasSmall('dust', cost.dust)) {
    if (!quiet) {
      playSfx('warn')
      ui.toast(reforgeShortToast(), 'warn')
    }
    return false
  }

  const template = equipmentTemplate(inst.templateId)
  if (!template) return false
  const quality = qualityDef(inst.quality)
  const sealed = new Set(inst.sealedAffixIds ?? [])
  const kept = inst.affixes.filter(a => sealed.has(a.id))
  const [minCount, maxCount] = quality.affixes

  resources.spendStone(cost.stone)
  resources.spendSmall('dust', cost.dust)

  // 条数:品质区间内重掷,但以「锁定数」保底 —— 锁住的几条永远不会被掷掉。
  // 注意这里**不**再 +1 抬下限:「锁定数 + 1」是旧判据(全锁即禁洗)的配套物;
  // 判据换成「锁定数 < 品质上限」之后,若还按锁定数 + 1 掷,锁满边缘会被强制涨条,
  // 玩家平白丢掉「维持条数只换数值」的能力(见 8f90499)。
  const wantCount = Math.max(kept.length, Math.min(maxCount, rng.int(minCount, maxCount)))
  const used = new Set([...kept.map(a => a.id)])
  const fresh: { id: string; roll: number }[] = []
  let guard = 0
  while (fresh.length < wantCount - kept.length && guard < 50) {
    guard += 1
    const pool = AFFIXES.filter(a => !used.has(a.id) && affixFitBlock(a, template.slot, quality.rank) === null)
    if (pool.length === 0) break
    const picked = rng.weighted(pool, a => a.weight)
    used.add(picked.id)
    fresh.push({ id: picked.id, roll: rng.next() })
  }
  const affixes = [...kept, ...fresh]
  const before = inst.affixes.length
  inventory.replaceItem({ ...inst, affixes, reforgeCount: (inst.reforgeCount ?? 0) + 1 })
  track('upgrades')
  // 重铸也是炼器:上头一味矿材作「上手过」(矿石通晓/锻造技艺的唯一活水);
  // 重铸更是刻纹 —— 铭纹技艺此前定义了却从没人涨过(玩家反馈「铭纹熟练度老版本为0,
  // 新版本没看到新系统」),真正「刻纹引灵」的活儿就该长这门手艺
  noteSmithingUsed(inst.tier, true)
  useLoreStore().addSkillExp('inscribe', 10 * (1 + inst.tier * 0.2))

  const lockedNote = reforgeLockedNote(kept.length)
  const countNote = before === affixes.length ? `${affixes.length} 条` : `${before} → ${affixes.length} 条`
  if (!quiet) {
    playSfx('success')
    ui.toast(reforgeDoneToast(countNote, lockedNote), 'success')
  }
  return true
}

/**
 * 锁定一条词条(或解锁它):再点一次即解除锁定,不退灵石。
 *
 * 与旧「封存」的差别:锁定**可解除**,也不强制留一个可重掷位 ——
 * 全部锁住只是「这一件不能再重铸」,那本来就是合法的终局状态。
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
 * 词条转移「同时锁定」那一笔的费用 —— 与手动锁定同一函数(lockCost)。
 * 保留 sealCost 之名(转移服务按此名调用),判据改认新口径(lockCap):
 * 锁满(锁定数达品质上限)则无价可报,调用方视为不可再锁。
 */
export function sealCost(inst: EquipmentInstance): GNum | null {
  if ((inst.sealedAffixIds ?? []).length >= reforgeAffixCap(inst)) return null
  return lockCost(inst)
}

/**
 * 词条转移落位后的「同时锁定」—— 沿用锁定语义(可再点解除),判据同上。
 * 保留 sealAffix 之名(旧调用按此名),行为即锁定一条。
 */
export function sealAffix(uid: string, affixId: string): boolean {
  return toggleAffixLock(uid, affixId)
}

/**
 * 一件装备还能再锁几条 —— 界面/转移共用(旧名 sealCapacity,判据改认新口径:
 * 不设留位,恒为未锁定的剩余条数)。
 */
export function sealCapacity(inst: EquipmentInstance): number {
  return lockCapacity(inst)
}

/**
 * 「保留 keptIds、其余重铸」时,在这件上洗出 affixId(任意数值)平均要几次 —— 词条转移的定价参照。
 *
 * 照 reforgeEquipment 的规则推:每次新抽 max(保留, 区间内条数) − 保留 条,
 * 从同一个池子(部位、品质合规且不在保留里)按权重抽。一阶近似:
 * 单次命中率 ≈ 平均新抽条数 × 该条权重 ÷ 池总权重(无放回抽取让真实命中率略高,
 * 与真重铸对账见 affixTransferEconomy.spec)。
 * 改重铸的条数或抽取规则时,这里要跟着改 —— 那边的审计会先红。
 * 洗不出(模板缺失、部位或品质不合)返回 Infinity。
 */
export function expectedRollsToHit(inst: EquipmentInstance, affixId: string, keptIds: readonly string[]): number {
  const template = equipmentTemplate(inst.templateId)
  const def = affixDef(affixId)
  if (!template || !def) return Infinity
  const quality = qualityDef(inst.quality)
  if (affixFitBlock(def, template.slot, quality.rank) !== null) return Infinity
  const kept = new Set(keptIds)
  const poolWeight = AFFIXES.filter(a => !kept.has(a.id) && affixFitBlock(a, template.slot, quality.rank) === null).reduce(
    (sum, a) => sum + a.weight,
    0
  )
  if (poolWeight <= 0) return Infinity
  const [lo, hi] = quality.affixes
  let fresh = 0
  for (let c = lo; c <= hi; c += 1) fresh += Math.max(kept.size, c) - kept.size
  fresh /= hi - lo + 1
  return 1 / Math.min(1, (fresh * def.weight) / poolWeight)
}

// ---------- 自动重铸(玩家反馈:一键重铸多次,洗到指定词条就停) ----------

/** 自动重铸的停止条件:出现「id 命中且 roll ≥ minRoll(未给则任意值)」即收手 */
export interface ReforgeTarget {
  affixId: string
  /** 要求的最低 roll(0~1;不填 = 只要出现这个词条就行) */
  minRoll?: number
}

/** 这件装备当前是否命中任一目标;命中返回那一条 */
export function refRoleMatches(inst: EquipmentInstance, targets: readonly ReforgeTarget[]): { id: string; roll: number } | null {
  for (const t of targets) {
    const hit = inst.affixes.find(a => a.id === t.affixId && (t.minRoll === undefined || a.roll >= t.minRoll))
    if (hit) return { id: hit.id, roll: hit.roll }
  }
  return null
}

export type AutoReforgeStop = 'target' | 'budget' | 'broke' | 'frozen'

export interface AutoReforgeOutcome {
  /** 实际洗了几次 */
  rolls: number
  /** 这几次的灵石账 */
  stone: GNum
  /** 这几次的器灵尘账 */
  dust: number
  stop: AutoReforgeStop
  /** 命中目标的那一条(null = 没洗到,撞了预算/没钱/无位可洗) */
  hit: { id: string; roll: number } | null
  /** 收手时这件装备的词条 id 全表 */
  affixIds: string[]
}

/**
 * 自动重铸:至多重铸 maxRolls 次,洗出任一目标词条(可带最低 roll)即停。
 * 逐次与手动连点完全等价 —— 每洗一次照常消耗与长技艺,只是提示合成一条。
 * 停法:
 * - target  洗出目标,收手;
 * - budget  洗满预算也没出,收手(不硬刷);
 * - broke   灵石/器灵尘见底,收手;
 * - frozen  这件已无位可洗(锁满)或已不存在。
 */
export function autoReforge(uid: string, targets: readonly ReforgeTarget[], maxRolls: number): AutoReforgeOutcome {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  let stone = gnZero()
  let dust = 0
  // 一个目标都没给:收手,不烧预算 —— 面板上按钮禁用只是挡层,服务本身不当
  if (targets.length === 0) {
    return { rolls: 0, stone, dust, stop: 'budget', hit: null, affixIds: [] }
  }
  // 装备已含目标词条:分文不动,直接收手 —— 别花一次重铸把已到手的条件洗没
  const initial = inventory.findItem(uid)
  if (initial) {
    const hit = refRoleMatches(initial, targets)
    if (hit) return { rolls: 0, stone, dust, stop: 'target', hit, affixIds: initial.affixes.map(a => a.id) }
  }
  for (let i = 0; i < maxRolls; i += 1) {
    const inst = inventory.findItem(uid)
    const cost = inst && reforgeCost(inst)
    if (!inst || !cost) return { rolls: i, stone, dust, stop: 'frozen', hit: null, affixIds: [] }
    if (!resources.hasStone(cost.stone) || !resources.hasSmall('dust', cost.dust)) {
      return { rolls: i, stone, dust, stop: 'broke', hit: null, affixIds: inst.affixes.map(a => a.id) }
    }
    if (!reforgeEquipment(uid, true)) {
      return { rolls: i, stone, dust, stop: 'frozen', hit: null, affixIds: inst.affixes.map(a => a.id) }
    }
    stone = add(stone, cost.stone)
    dust += cost.dust
    const after = inventory.findItem(uid)
    if (!after) return { rolls: i + 1, stone, dust, stop: 'frozen', hit: null, affixIds: [] }
    const hit = refRoleMatches(after, targets)
    if (hit) return { rolls: i + 1, stone, dust, stop: 'target', hit, affixIds: after.affixes.map(a => a.id) }
  }
  const last = inventory.findItem(uid)
  return {
    rolls: maxRolls,
    stone,
    dust,
    stop: 'budget',
    hit: null,
    affixIds: last ? last.affixes.map(a => a.id) : []
  }
}
