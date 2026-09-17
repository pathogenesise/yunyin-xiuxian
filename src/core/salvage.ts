/**
 * 分解返还 —— 一件装备化尘时该退回什么
 *
 * 两条账,分开算:
 *   底材  按品质给一份固定器灵尘(DECOMPOSE_DUST),这是它本身的料;
 *   强化  练过的件另退强化投入的八成(尘与灵石同率),免得「练了三级,一拆全没了」。
 *
 * 强化投入以**实例上记的账**为准(item.invested,每次强化时累加),不按公式重算:
 * 公式里的 forgeDiscount 是当时那一身装束的折扣,只有账本记得住。
 * 老档(本次改动之前强化过的件)没有这本账,退回标价 —— 顶多让带折扣的旧档多退一点;
 * 新账一律按实付记,故「强化再拆」永远拿不回本(八成 < 十成),不构成套利。
 */
import type { EquipmentInstance, GNum } from '@/types'
import { DECOMPOSE_DUST, DECOMPOSE_REFUND_RATE } from '@/data/constants'
import { qualityDef } from '@/data/qualities'
import { add, gn, gnZero, mulN } from '@/utils/gnum'
import { upgradeCost } from './formulas'

export interface Salvage {
  dust: number
  stone: GNum
}

/** 一件装备累计花掉的强化成本(尘 / 灵石) */
export function enhanceInvested(item: EquipmentInstance): Salvage {
  if (item.invested) return { dust: item.invested.dust, stone: gn(item.invested.stone) }
  const rank = qualityDef(item.quality).rank
  let dust = 0
  let stone = gnZero()
  for (let level = 0; level < item.level; level += 1) {
    const cost = upgradeCost(level, item.tier, rank, 0)
    dust += cost.dust
    stone = add(stone, cost.stone)
  }
  return { dust, stone }
}

/** 分解 / 回收一件装备的返还:底材 + 强化投入的八成 */
export function salvageOf(item: EquipmentInstance): Salvage {
  const base = DECOMPOSE_DUST[qualityDef(item.quality).rank] ?? 1
  const spent = enhanceInvested(item)
  return {
    dust: base + Math.floor(spent.dust * DECOMPOSE_REFUND_RATE),
    stone: mulN(spent.stone, DECOMPOSE_REFUND_RATE)
  }
}
