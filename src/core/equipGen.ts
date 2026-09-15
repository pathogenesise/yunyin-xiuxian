/**
 * 装备生成与数值解析 —— Template + 随机品质 + 随机词条 → Instance
 */
import type { AffixRarity, AnyStatKey, EquipmentInstance, EquipSlot, GNum, QualityDef, StatMods } from '@/types'
import type { RandomService } from '@/utils/random'
import { uid } from '@/utils/id'
import { gnZero, mulN, add } from '@/utils/gnum'
import { AFFIXES, AFFIX_RARITY_RANK, affixDef, affixValue } from '@/data/affixes'
import { EQUIPMENT_TEMPLATES, equipmentTemplate } from '@/data/equipment'
import { QUALITIES, qualityDef } from '@/data/qualities'
import { EQUIP_BASE_FACTOR, EQUIP_LEVEL_BONUS, EQUIP_QUALITY_FLAT_EXP, QUALITY_TIER_SHIFT } from '@/data/constants'
import { powerScale } from './formulas'

export interface GenOptions {
  slot?: EquipSlot
  minQualityRank?: number
  /** 气运(提高高品质权重) */
  luck?: number
}

/** 九个可掉落槽位(法宝是另一套池子,见 artifacts) */
const DROP_SLOTS: EquipSlot[] = [
  'weapon',
  'head',
  'body',
  'wrist',
  'belt',
  'boots',
  'necklace',
  'ring',
  'talisman'
]

/**
 * 某槽位在某层级下的模板 —— **按阶取,不累积**。
 *
 * 从前这里是「minTier ≤ 层级」的累积池再取最近的几件,于是 13 阶的地界照样掉得出
 * 8 阶的星辰冠:同一个名字顶着不同的数字出现,名字就失去了分辨力(见 data/equipment 头注)。
 * 现在一件只属于一阶 —— 与「一阶一名」配套,看到名字就知道是哪一阶的东西。
 */
function templatesAtTier(tier: number, slot: EquipSlot) {
  return EQUIPMENT_TEMPLATES.filter(t => t.tier === tier && t.slot === slot)
}

/**
 * 取某阶某槽的模板;该阶若一件都没有,退到最近的一阶(先往下找,再往上)。
 *
 * 这道兜底**不该被走到**:realmNaming.spec 钉着「每阶每部位都有本阶名目」。
 * 留着它是为了让「哪天有人挪掉一阶的内容」表现为一次退档掉落,而不是在
 * rng.weighted(空池) 上抛错——掉错一件东西,总好过整局卡死在结算里。
 */
function templatesForDrop(tier: number, slot: EquipSlot) {
  const here = templatesAtTier(tier, slot)
  if (here.length > 0) return here
  const tiers = [...new Set(EQUIPMENT_TEMPLATES.filter(t => t.slot === slot).map(t => t.tier))].sort((a, b) => b - a)
  const fallback = tiers.find(t => t < tier) ?? tiers[tiers.length - 1]
  return fallback === undefined ? [] : templatesAtTier(fallback, slot)
}

/**
 * 某层级(可选槽位)下真正进池的装备模板。
 *
 * 抽出来独立成函数不是为了好看 —— 判据要能**直接问池子**:
 * 「这 288 件里,有没有哪件在任何层级都进不了池?」池子藏在生成器内部时,
 * 这种问题只能靠反复抽样去猜,而抽样永远证明不了「掉不出来」。
 *
 * 不指定槽位时按槽位分组(九个槽位一视同仁),而不是把整阶的九件混作一堆 ——
 * 混作一堆时,表里哪个槽位多写了一件,那一件就会挤掉别的槽位的出场机会。
 */
export function equipTemplatePool(tier: number, slot?: EquipSlot) {
  if (slot !== undefined) return templatesForDrop(tier, slot)
  return DROP_SLOTS.flatMap(s => templatesForDrop(tier, s))
}

/** 品质随机:层级越高、气运越高,高品质权重越大 */
export function rollQuality(tier: number, rng: RandomService, opts: GenOptions = {}): QualityDef {
  const luck = opts.luck ?? 0
  const floor = opts.minQualityRank ?? 0
  const pool = QUALITIES.filter(q => q.rank >= floor)
  return rng.weighted(pool, q => {
    if (q.rank === 0) return q.weight
    const tierBoost = Math.pow(QUALITY_TIER_SHIFT, (tier - 1) * Math.min(q.rank, 4) * 0.35)
    const luckBoost = 1 + luck * (q.rank >= 3 ? 1.5 : 0.5)
    return q.weight * tierBoost * luckBoost
  })
}

/** 生成一件装备实例 */
export function generateEquipment(tier: number, rng: RandomService, opts: GenOptions = {}): EquipmentInstance {
  // 未指定槽位:九个槽位一视同仁(掉了什么槽位,不该由表的行序决定),
  // 槽位之内若还有多件(同阶同槽的备用名目),按各自权重挑。
  const slot = opts.slot ?? DROP_SLOTS[Math.min(DROP_SLOTS.length - 1, rng.int(0, DROP_SLOTS.length - 1))]!
  const eligible = equipTemplatePool(tier, slot)
  // 同阶同槽通常只有一件;万一有多件,按旗鼓相当的权重挑
  const template = rng.weighted(eligible, () => 1)

  const quality = rollQuality(tier, rng, opts)
  const [minA, maxA] = quality.affixes
  const affixCount = rng.int(minA, maxA)

  const chosen: { id: string; roll: number }[] = []
  const used = new Set<string>()
  let guard = 0
  while (chosen.length < affixCount && guard < 50) {
    guard += 1
    const candidates = AFFIXES.filter(
      a =>
        !used.has(a.id) &&
        (a.minRank === undefined || quality.rank >= a.minRank) &&
        (a.slots === undefined || a.slots.includes(template.slot))
    )
    if (candidates.length === 0) break
    const picked = rng.weighted(candidates, a => a.weight)
    used.add(picked.id)
    chosen.push({ id: picked.id, roll: rng.next() })
  }

  return {
    uid: uid(),
    templateId: template.id,
    quality: quality.id,
    tier,
    level: 0,
    affixes: chosen
  }
}

export interface ResolvedEquipStats {
  flats: { attack: GNum; defense: GNum; maxHp: GNum }
  mods: StatMods
  /**
   * 词条展示行 —— **已是展示序**(见 sortAffixLines),不是掷出的先后。
   * 掷出的顺序是随机的,照着印出来等于把「哪条要紧」交给运气。
   */
  affixLines: { id: string; name: string; desc: string; rarity: AffixRarity }[]
}

/**
 * 词条展示序:先稀有的(传世 → 常见),同稀有度先看掷得满的,最后按 id 稳定。
 *
 * 判据:玩家扫一眼装备卡片,第一条就该是这件东西最值钱的地方。
 * 稀有度写在词条定义里(权重推出来的),成色就是这一件的 roll —— 两者都是既有数据。
 */
export function sortAffixLines<T extends { id: string; roll: number }>(rolls: readonly T[]): T[] {
  return [...rolls].sort((a, b) => {
    const ra = AFFIX_RARITY_RANK[affixDef(a.id)?.rarity ?? 'common']
    const rb = AFFIX_RARITY_RANK[affixDef(b.id)?.rarity ?? 'common']
    return rb - ra || b.roll - a.roll || a.id.localeCompare(b.id)
  })
}

/** 解析装备实例的实际数值 */
export function resolveEquipStats(inst: EquipmentInstance): ResolvedEquipStats {
  const template = equipmentTemplate(inst.templateId)
  const flats = { attack: gnZero(), defense: gnZero(), maxHp: gnZero() }
  const mods: StatMods = {}
  const affixLines: ResolvedEquipStats['affixLines'] = []
  if (!template) return { flats, mods, affixLines }

  const q = qualityDef(inst.quality)
  const scale = powerScale(inst.tier)
  // 品质对平铺按 EQUIP_QUALITY_FLAT_EXP 压缩:高品质的价值主要体现在词条数量上,
  // 而不是把平铺数值再翻几倍(Phase 33.2,详见常量处注释)
  const factor = EQUIP_BASE_FACTOR * Math.pow(q.mult, EQUIP_QUALITY_FLAT_EXP) * (1 + inst.level * EQUIP_LEVEL_BONUS)

  for (const key of ['attack', 'defense', 'maxHp'] as const) {
    const weight = template.base[key]
    if (weight) flats[key] = add(flats[key], mulN(scale, weight * factor))
  }
  if (template.fixedMods) {
    for (const k in template.fixedMods) {
      const key = k as AnyStatKey
      mods[key] = (mods[key] ?? 0) + (template.fixedMods[key] ?? 0)
    }
  }
  for (const roll of sortAffixLines(inst.affixes)) {
    const def = affixDef(roll.id)
    if (!def) continue
    const value = affixValue(def, roll.roll)
    mods[def.key] = (mods[def.key] ?? 0) + value / 100
    affixLines.push({ id: def.id, name: def.name, desc: def.desc.replace('{v}', String(value)), rarity: def.rarity })
  }
  return { flats, mods, affixLines }
}
