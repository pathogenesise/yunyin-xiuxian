/**
 * 灵兽性格服务(Phase 31.0 S4)
 *
 * 灵兽不只是数值加成:性格决定历练时的行为倾向。
 * 玩家选伙伴 = 选路线风格,而非单纯"哪个数值高"。
 *
 * 性格只动这四件事(见 EFFECTS,界面 petTraitText 同源):
 *   greedy 贪宝 —— 装备成色更好,遇险略高
 *   steady 慢稳 —— 行程更久,遇险略低,败北偶有护持
 *   fierce 好战 —— 遇险更高,成色略涨(不另加战斗修为或灵石)
 *   cautious 谨慎 —— 行程略短,遇险略低,成色稍降,败北更有护持
 */
import type { PetDef } from '@/types'
import { petDef } from '@/data/pets'

export interface PetPersonalityEffects {
  /** 历练时长倍率(steady 更久) */
  exploreDurMult: number
  /** 危险率修正(fierce 更高) */
  dangerMult: number
  /** 掉落品质修正(greedy 更高) */
  dropLuck: number
  /** 战败率修正(cautious 更低) */
  lossReduction: number
}

const EFFECTS: Record<PetDef['personality'], PetPersonalityEffects> = {
  greedy: { exploreDurMult: 1.0, dangerMult: 1.05, dropLuck: 0.06, lossReduction: 0 },
  steady: { exploreDurMult: 1.1, dangerMult: 0.98, dropLuck: 0, lossReduction: 0.02 },
  fierce: { exploreDurMult: 1.0, dangerMult: 1.15, dropLuck: 0.02, lossReduction: 0 },
  cautious: { exploreDurMult: 0.95, dangerMult: 0.95, dropLuck: -0.02, lossReduction: 0.04 }
}

export const PERSONALITY_NAMES: Record<PetDef['personality'], string> = {
  greedy: '贪宝',
  steady: '慢稳',
  fierce: '好战',
  cautious: '谨慎'
}

/** 陪行灵兽的性格效果(无灵兽时返回中性) */
export function personalityEffects(petId: string | null): PetPersonalityEffects {
  if (!petId) return { exploreDurMult: 1, dangerMult: 1, dropLuck: 0, lossReduction: 0 }
  const def = petDef(petId)
  if (!def) return { exploreDurMult: 1, dangerMult: 1, dropLuck: 0, lossReduction: 0 }
  return EFFECTS[def.personality] ?? { exploreDurMult: 1, dangerMult: 1, dropLuck: 0, lossReduction: 0 }
}

const PERSONALITY_LEAD: Record<PetDef['personality'], string> = {
  greedy: '贪其宝货',
  steady: '行路从容',
  fierce: '争锋不让',
  cautious: '步步知止'
}

/** 性格一句话说明(选灵兽 UI) —— 文言说清 EFFECTS 里真有的事,不另许修为灵石或机缘 */
export function personalityDesc(p: PetDef['personality']): string {
  const e = EFFECTS[p]
  const parts: string[] = [PERSONALITY_LEAD[p]]
  if (e.exploreDurMult > 1) parts.push('行程更久,如缓步看山')
  if (e.exploreDurMult < 1) parts.push('行程略短,不敢久羁')
  if (e.dangerMult > 1) parts.push('遇险更高')
  if (e.dangerMult < 1) parts.push('遇险略低')
  if (e.dropLuck > 0) parts.push('装备成色更好')
  if (e.dropLuck < 0) parts.push('装备成色稍降')
  if (e.lossReduction > 0) parts.push('败北偶有护持')
  return `${parts.join(',')}。`
}
