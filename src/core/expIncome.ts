/**
 * 修为收入结构 —— 三条渠道各值多少,以及它们为什么互相打平
 *
 * ## 设计口径(Phase 39 续,见 docs/superpowers/specs/2026-09-17-*)
 *
 * 修为只有一种计价单位:**等效闭关时长**;只有一条基线:挂机修炼(修速/秒)。
 *
 *   挂机修炼      1.0×   ——  底,什么也不用做
 *   历练(+挂机)  ≈2.5×  ——  遭遇是自动的(每 12 秒一次),故它与挂机并行
 *   闭关          2.5×   ——  但期间**不能历练**
 *
 * 三者正好构成一个闭合的取舍:**闭关与「挂机 + 历练」打平**(2.5× vs 2.51×,
 * 实测差 0.6%),所以「专心修炼」换来的是不被打断,代价是放弃掉落;
 * 「出门历练」换来的是掉落,代价是修为上并不更快。没有哪条路白送。
 *
 * 之所以要专门有个文件量这件事:从前历练的修为按「当前一层需求的百分比」给,
 * 一层耗时每境 ×3.65,于是每场遭遇折算的闭关时间随境界指数上涨
 * (实测真仙 35.7 小时/场、混沌道祖 1931 小时/场),挂机在化神之后成了装饰 ——
 * 而全仓库所有「这一境要修多久」的读数都只算了挂机那一条线。
 *
 * 判据见 expIncome.spec:守的是设计不变量(三条渠道的倍率关系),
 * 不是"当时那两个数长什么样"。
 */
import { BATTLE_EXP_SECS, EXPLORE_BATTLE_INTERVAL, EXPLORE_EVENT_CHANCE } from '@/data/constants'
import { buffDef } from '@/data/buffs'
import { MAX_MAJOR } from '@/data/realms'

/**
 * 典型胜率 —— 与 core/economySim 的行为假设同一份:赢下来才结算修为。
 * 取 0.85 而不是 1:地界凶险、越级与妖潮都会输,全时历练不是全胜。
 */
export const TYPICAL_WIN_RATE = 0.85

/**
 * 一次际遇的**典型**等效闭关秒 —— 事件数据里是 30~120 秒(中位 60),这里取 60。
 * 本文件量的是结构(三条渠道谁大),不是某一次际遇的具体值;具体值由
 * data/events 与 data/chains 的 secs 决定,那一条由 expIncome.spec 守着区间。
 */
export const TYPICAL_EVENT_EXP_SECS = 60

/** 每小时遭遇数(战斗 + 际遇):在线每 12 秒一次,离线照算 */
export function encountersPerHour(): number {
  return 3600 / EXPLORE_BATTLE_INTERVAL
}

/** 每小时战斗次数(出际遇的那几次不算战斗) */
export function battlesPerHour(): number {
  return encountersPerHour() * (1 - EXPLORE_EVENT_CHANCE)
}

/** 每小时胜场 —— 修为按胜场结算 */
export function winsPerHour(): number {
  return battlesPerHour() * TYPICAL_WIN_RATE
}

/** 每小时际遇次数 */
export function eventsPerHour(): number {
  return encountersPerHour() * EXPLORE_EVENT_CHANCE
}

/** 历练那一半:每小时折算的等效闭关秒(胜场 × 一场的时长 + 际遇 × 一次的时长) */
export function tripExpSecsPerHour(): number {
  return winsPerHour() * BATTLE_EXP_SECS + eventsPerHour() * TYPICAL_EVENT_EXP_SECS
}

/** 挂机那一半:一小时就是 3600 秒闭关 */
export function idleExpSecsPerHour(): number {
  return 3600
}

/** 闭关那一半:修速 +150%(取自 buffs 本体,不在这里抄一个 150%) */
export function retreatExpSecsPerHour(): number {
  return idleExpSecsPerHour() * (1 + (buffDef('retreat')?.mods.cultivationSpeed ?? 0))
}

export interface ExpIncomeRow {
  major: number
  /** 挂机修炼(基线) */
  idlePerHour: number
  /** 历练那一半(与挂机并行) */
  tripPerHour: number
  /** 挂机 + 历练 合计 */
  totalPerHour: number
  /** 闭关专修(不能历练) */
  retreatPerHour: number
  /** 合计 ÷ 挂机 —— 设计目标是 ≈2.5,且不随境界变 */
  ratio: number
}

export function expIncomeAt(major: number): ExpIncomeRow {
  const idle = idleExpSecsPerHour()
  const trip = tripExpSecsPerHour()
  return {
    major,
    idlePerHour: idle,
    tripPerHour: trip,
    totalPerHour: idle + trip,
    retreatPerHour: retreatExpSecsPerHour(),
    ratio: (idle + trip) / idle
  }
}

export function expIncomeAudit(): ExpIncomeRow[] {
  const out: ExpIncomeRow[] = []
  for (let m = 0; m <= MAX_MAJOR; m += 1) out.push(expIncomeAt(m))
  return out
}
