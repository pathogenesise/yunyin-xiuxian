/**
 * 智能收纳(Phase 26)—— 行囊的自动去留裁决
 * 不只按品质:识别流派核心件与组合技关键件——
 * 「这件装备单看一般,但它是你罡盾·反震组合技的关键部件」
 */
import type { EquipmentInstance } from '@/types'
import { qualityDef } from '@/data/qualities'
import { BUILD_STYLES, detectBuild } from './buildDetect'
import { matchComboArt } from '@/data/comboArts'
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
}

export interface KeepVerdict {
  keep: boolean
  reason: string
}

/** 判定一件装备是否值得收纳 */
export function keepVerdict(item: EquipmentInstance): KeepVerdict {
  const settings = useSettingsStore()
  const cfg = settings.smartKeep
  const q = qualityDef(item.quality)
  if (q.rank >= cfg.minQuality) return { keep: true, reason: `${q.name}当藏` }

  const player = usePlayerStore()
  const build = detectBuild(player.finalStats.mods)
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

/** 是否启用智能收纳 */
export function smartKeepEnabled(): boolean {
  return useSettingsStore().smartKeep.enabled
}
