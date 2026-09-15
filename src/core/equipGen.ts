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

/** 单个槽位的候选窗:该槽位里最近的 K 件 —— 旧模不该在终局满地掉 */
const NEAR_TEMPLATE_WINDOW = 6

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

/** 某槽位在某层级下够得着的模板:minTier ≤ 层级,按由近及远取前 K 件 */
function nearTemplates(tier: number, slot: EquipSlot) {
  const eligible = EQUIPMENT_TEMPLATES.filter(t => t.minTier <= tier && t.slot === slot)
  return [...eligible].sort((a, b) => b.minTier - a.minTier).slice(0, Math.min(NEAR_TEMPLATE_WINDOW, eligible.length))
}

/**
 * 某层级(可选槽位)下真正进池的装备模板。
 *
 * 抽出来独立成函数不是为了好看 —— 判据要能**直接问池子**:
 * 「这 120 件里,有没有哪件在任何层级都进不了池?」池子藏在生成器内部时,
 * 这种问题只能靠反复抽样去猜,而抽样永远证明不了「掉不出来」。
 *
 * **不指定槽位时先按槽位分组**,是这里唯一一条不能省的结构:
 * 从前不分槽位、全表取「最近的 6 件」,而仙界/神界/混沌海各自恰有 9 件、
 * 表序固定 —— 于是排在中间与后面的三个槽位(项链/戒指/灵符)永远挤不进窗口,
 * 打多少场都掉不出来,图鉴里那九格谁也点不亮。(ISS-196)
 */
export function equipTemplatePool(tier: number, slot?: EquipSlot) {
  if (slot !== undefined) return nearTemplates(tier, slot)
  return DROP_SLOTS.flatMap(s => nearTemplates(tier, s))
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
  // 槽位之内再按「最近的优先」挑具体模板。
  const slot = opts.slot ?? DROP_SLOTS[Math.min(DROP_SLOTS.length - 1, rng.int(0, DROP_SLOTS.length - 1))]!
  const eligible = equipTemplatePool(tier, slot)
  // 优先掉落接近当前层级的模板
  const template = rng.weighted(eligible, t => 1 + t.minTier)

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
