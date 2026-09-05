/**
 * Phase 29 修行目标 —— 给玩家"现在应该干什么"的轻量上下文
 *
 * 核心原则:
 * - 给方向,不替玩家做决定
 * - 不引入新资源/新系统,只复用现有状态
 * - 从前期教学自然过渡到 Build 游戏
 *
 * 类型:
 * - breakthrough  修为接近突破 → "尝试突破XX"
 * - equipment     装备槽有空位 → "寻一件XX法器"
 * - explore       区域未探索   → "深入XX"
 * - material      材料不足     → "采集XX"
 * - build         流派未成形   → "凑出XX流" (中期核心目标)
 */
import { usePlayerStore } from '@/stores/player'
import { detectBuild } from './buildDetect'
import { realmLabel } from '@/data/realms'

export type GoalType = 'breakthrough' | 'equipment' | 'explore' | 'material' | 'build'

export interface Goal {
  type: GoalType
  text: string
  /** 进度(0~1),可选 */
  progress?: number
  /** 建议下一步(可选) */
  hint?: string
}

/** 纯函数:根据玩家状态生成当前目标 */
export function generateCurrentGoal(player: ReturnType<typeof usePlayerStore>): Goal | null {
  // 1. 死后无目标
  if (player.dead) return null

  // 2. 修为接近突破(最高优先级)
  if (player.expProgress >= 0.85) {
    const next = realmLabel(player.major, Math.min(player.sub + 1, 9))
    return {
      type: 'breakthrough',
      text: `尝试突破「${next}」`,
      progress: player.expProgress,
      hint: '修为已近圆满,服用凝神丹或静坐调息可提升成功率'
    }
  }
  if (player.expProgress >= 0.5) {
    const next = realmLabel(player.major, Math.min(player.sub + 1, 9))
    return {
      type: 'breakthrough',
      text: `向「${next}」迈进`,
      progress: player.expProgress
    }
  }

  // 3. 检测 Build 完整度(中期核心目标)
  const build = detectBuild(player.finalStats.mods)
  if (build) {
    const style = build.style.name
    const core = Math.max(1, build.coreValues.length)
    return {
      type: 'build',
      text: `完善「${style}」流派`,
      progress: Math.min(1, core / 4),
      hint: `当前已凑出 ${core}/4 个核心词条,继续寻找关键装备`
    }
  }

  // 4. 低优先级:探索/材料/装备(此处作为兜底)
  return null
}
