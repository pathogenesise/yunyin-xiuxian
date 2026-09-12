/**
 * 智能收纳(Phase 26)—— 行囊的自动去留裁决
 * 不只按品质:识别流派核心件与组合技关键件——
 * 「这件装备单看一般,但它是你罡盾·反震组合技的关键部件」
 *
 * 另外三类**永不自动处置**(玩家没说可以扔,就不能替他扔):
 *   练过的件 —— 强化过 / 重铸过 / 封存过词条的,身上有他的投入,只有本人能决定;
 *   成套共鸣件 —— 机制 > 数值,凑不齐第二件才是真亏;
 *   词条近满件 —— 条条都在满值线以上,数值本就高过同档。
 */
import type { EquipmentInstance } from '@/types'
import { qualityDef } from '@/data/qualities'
import { SMART_KEEP_PERFECT_ROLL } from '@/data/constants'
import { equipmentTemplate } from '@/data/equipment'
import { BUILD_STYLES, detectBuild } from './buildDetect'
import { matchComboArt } from '@/data/comboArts'
import { equipSetDef } from './equipSet'
import { resolveEquipStats } from './equipGen'
import { usePlayerStore } from '@/stores/player'
import { useSettingsStore } from '@/stores/settings'

export interface SmartKeepConfig {
  enabled: boolean
  /** 达到此品质 rank 一律保留 */
  minQuality: number
  /** 保留含当前主流派核心词条的装备 */
  keepCoreAffix: boolean
  /** 保留可能促成组合技的副体系件 */
  keepComboPiece: boolean
  /** 保留词条条条近满的件 */
  keepPerfectRolls: boolean
  /** 保留成套共鸣件 */
  keepSetPiece: boolean
}

export interface KeepVerdict {
  keep: boolean
  reason: string
}

/**
 * 自动回收裁决 —— 装备进包前的第一道闸
 * 命中任一条,该件不入行囊、直接化尘(在线离线统一):
 *   1. 玩家在「一键分解」里勾选的品质档(显式废料声明)
 *   2. 智能收纳开启且判「与道无缘」
 * 上锁者豁免。
 */
export function shouldAutoRecycle(item: EquipmentInstance): boolean {
  if (item.locked) return false
  const settings = useSettingsStore()
  const q = qualityDef(item.quality)
  if (settings.decomposeRanks.includes(q.rank)) return true
  return settings.smartKeep.enabled && !keepVerdict(item).keep
}

/** 身上有没有玩家的投入(强化 / 重铸 / 封存词条)—— 有则不参与一切自动去留 */
export function hasInvestment(item: EquipmentInstance): boolean {
  return item.level > 0 || (item.reforgeCount ?? 0) > 0 || (item.sealedAffixIds ?? []).length > 0
}

/** 词条是否条条都在满值线以上(0 词条的件不算 —— 那是没得夸,不是满值) */
export function perfectRolls(item: EquipmentInstance): boolean {
  return item.affixes.length > 0 && item.affixes.every(a => a.roll >= SMART_KEEP_PERFECT_ROLL)
}

/** 判定一件装备是否值得收纳 */
export function keepVerdict(item: EquipmentInstance): KeepVerdict {
  const cfg = useSettingsStore().smartKeep
  const q = qualityDef(item.quality)
  // 先于品质:练过的件不属于「自动裁决」的管辖范围
  if (hasInvestment(item)) return { keep: true, reason: '已淬养,留待你自己定夺' }
  if (q.rank >= cfg.minQuality) return { keep: true, reason: `${q.name}当藏` }

  // 这两条不看流派,故排在「道途未成」之前 —— 新档也该留住成套件与满值件
  const setId = equipmentTemplate(item.templateId)?.set
  if (cfg.keepSetPiece && setId) return { keep: true, reason: `「${equipSetDef(setId)?.name ?? '成套'}」套件` }
  if (cfg.keepPerfectRolls && perfectRolls(item)) return { keep: true, reason: '词条近满' }

  const build = detectBuild(usePlayerStore().finalStats.mods)
  if (!build) return { keep: false, reason: '道途未成,唯品质论' }
  const mods = resolveEquipStats(item).mods

  if (cfg.keepCoreAffix) {
    for (const key of Object.keys(build.style.core)) {
      if ((mods[key as keyof typeof mods] ?? 0) > 0) {
        return { keep: true, reason: `含${build.style.name}核心词条` }
      }
    }
  }
  if (cfg.keepComboPiece) {
    // 与主流派可成组合技的副体系:这类词条件是「未来的组合技部件」
    for (const style of BUILD_STYLES) {
      if (style.id === build.style.id) continue
      const art = matchComboArt(build.style.id, style.id)
      if (!art) continue
      for (const key of Object.keys(style.core)) {
        if ((mods[key as keyof typeof mods] ?? 0) > 0) {
          return { keep: true, reason: `「${art.name}」组合技部件` }
        }
      }
    }
  }
  return { keep: false, reason: '与道无缘' }
}

/**
 * 行囊满时该挤掉谁:品质最低 → 层级最低 → 词条最弱。
 * (练过的件根本进不了候选 —— 见 keepVerdict 的第一条。)
 */
export function compareEvictable(a: EquipmentInstance, b: EquipmentInstance): number {
  const qa = qualityDef(a.quality).rank
  const qb = qualityDef(b.quality).rank
  if (qa !== qb) return qa - qb
  if (a.tier !== b.tier) return a.tier - b.tier
  return rollSum(a) - rollSum(b)
}

function rollSum(item: EquipmentInstance): number {
  return item.affixes.reduce((s, x) => s + x.roll, 0)
}

/** 是否启用智能收纳 */
export function smartKeepEnabled(): boolean {
  return useSettingsStore().smartKeep.enabled
}
