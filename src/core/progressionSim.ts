/**
 * 进度模拟器(Phase 14 数值曲线审计)
 * 纯函数:基于真实公式估算各境界耗时与多周目加速曲线
 * 注意:未计入突破失败/灵气等待/历练时间,真实耗时约为估算的 1.5~3 倍
 */
import { toNum } from '@/utils/gnum'
import { DAO_FRUIT_CULT_BONUS, SUB_LEVELS } from '@/data/constants'
import { baseCultPerSec, daoFruitGain, expRequirement } from './formulas'
import { effectiveDaoFruit } from './statsCalc'

export interface SimAssumptions {
  /** 灵根修行倍率(典型值 1.6) */
  linggenMult: number
  /** 转世天赋累计的修速加成 */
  talentCultBonus: number
}

export const DEFAULT_ASSUMPTIONS: SimAssumptions = { linggenMult: 1.6, talentCultBonus: 0 }

/**
 * 某大境界阶段的稳态修速总倍率估计
 * 功法换代 / 辅修 / 装备词条 / 洞府建筑均随境界水涨船高
 */
export function estimateCultMult(major: number, daoFruit: number, a: SimAssumptions = DEFAULT_ASSUMPTIONS): number {
  const gongfa = 0.12 + 0.055 * major
  const subGongfa = 0.06 + 0.05 * major
  const equip = 0.05 + 0.03 * major
  const building = Math.min(1.2, 0.1 + 0.09 * major)
  const qiRich = 0.15
  const fruit = effectiveDaoFruit(daoFruit) * DAO_FRUIT_CULT_BONUS
  return 1 + (a.linggenMult - 1) + a.talentCultBonus + gongfa + subGongfa + equip + building + qiRich + fruit
}

/** 修满一个大境界(一层到圆满)所需秒数 */
export function secondsForMajor(major: number, daoFruit: number, a: SimAssumptions = DEFAULT_ASSUMPTIONS): number {
  const mult = estimateCultMult(major, daoFruit, a)
  let total = 0
  for (let s = 0; s < SUB_LEVELS; s += 1) {
    total += toNum(expRequirement(major, s)) / (baseCultPerSec(major, s) * mult)
  }
  return total
}

/** 到达目标大境界的累计小时数(即完成其之前所有大境界) */
export function hoursToReach(targetMajor: number, daoFruit: number, a: SimAssumptions = DEFAULT_ASSUMPTIONS): number {
  let sec = 0
  for (let m = 0; m < targetMajor; m += 1) {
    sec += secondsForMajor(m, daoFruit, a)
  }
  return sec / 3600
}

export interface LifeRow {
  life: number
  daoFruit: number
  toZhuji: number
  toJindan: number
  toYuanying: number
}

/**
 * 多周目对照表:假设每世修至元婴后转世
 * (每世另按 +6% 修速估算天赋积累,封顶 40%)
 */
export function multiLifeTable(lives: number[]): LifeRow[] {
  const perLifeFruit = daoFruitGain(3, 0)
  return lives.map(life => {
    const daoFruit = (life - 1) * perLifeFruit
    const a: SimAssumptions = {
      linggenMult: 1.6,
      talentCultBonus: Math.min(0.4, (life - 1) * 0.06)
    }
    return {
      life,
      daoFruit,
      toZhuji: hoursToReach(1, daoFruit, a),
      toJindan: hoursToReach(2, daoFruit, a),
      toYuanying: hoursToReach(3, daoFruit, a)
    }
  })
}

/** 第一世里程碑表(供审计输出) */
export function firstLifeMilestones(): { major: number; hours: number }[] {
  const out: { major: number; hours: number }[] = []
  for (let m = 1; m <= 9; m += 1) {
    out.push({ major: m, hours: hoursToReach(m, 0) })
  }
  return out
}
