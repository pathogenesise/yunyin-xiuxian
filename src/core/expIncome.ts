/**
 * 修为收入结构 —— 挂机修炼 vs 历练遭遇
 *
 * ## 设计口径(Phase 39 续,见 docs/superpowers/specs/2026-09-17-*)
 *
 * 修为只有一条基线:**挂机修炼**(修速/秒)。另外两条都在它之上、且都有上限:
 *   挂机 1.0× · 历练 ≈1.6×(一场遭遇 12 秒等效 + 一次际遇 30~120 秒)· 闭关 2.5×
 * 一场遭遇折算成一段写死的等效闭关时长(BATTLE_EXP_SECS = 12 秒),
 * 一次际遇由事件数据给,两者都随玩家的修速缩放 ——
 * 于是「全时历练 ≈ 挂机的 1.6 倍」这个倍率**在任何境界都成立**,
 * 而修速词条/洞府/灵脉/闭关/丹药增益对两条线同时有效。
 *
 * ## 为什么要有这个文件
 *
 * 从前这里正好相反:历练的修为按「当前一层需求的百分比」给,一层耗时每境 ×3.65,
 * 于是每场遭遇折算的闭关时间随境界指数上涨(实测真仙 35.7 小时/场、
 * 混沌道祖 1931 小时/场),挂机修炼在化神之后成了装饰 —— 而本仓库所有
 * 「这一境要修多久」的读数(progressionSim / realPacing)都只算了挂机那一条线。
 *
 * 本文件把两条线摆在一起读数:每境一行、都是「等效闭关秒/小时」,
 * 比值随境界的变化一眼可见。判据见 expIncome.spec —— 守的是设计不变量,不是快照。
 */
import { BATTLE_EXP_SECS, EXPLORE_BATTLE_INTERVAL, EXPLORE_EVENT_CHANCE } from '@/data/constants'
import { MAX_MAJOR } from '@/data/realms'

/**
 * 一次际遇的典型等效闭关秒 —— 事件数据里是 60~240 秒,这里取 120 秒。
 *
 * 不逐事件算:本文件量的是**结构**(两条收入线谁大),不是某一次际遇的值。
 * 具体值由 data/events 与 data/chains 的 secs 决定,那一条由事件侧的判据守着。
 */
export const TYPICAL_EVENT_EXP_SECS = 60

export interface ExpIncomeRow {
  major: number
  /** 挂机修炼:等效闭关秒/小时(恒为 3600)—— 基线 */
  idlePerHour: number
  /** 历练里的战斗:每小时场次 × 每场等效秒 */
  battlePerHour: number
  /** 历练里的际遇:每小时次数 × 每次等效秒 */
  eventPerHour: number
  /** 历练合计 ÷ 挂机 —— 设计目标是 2~2.5 倍,且不随境界变 */
  ratio: number
}

/** 每小时遭遇数(战斗 + 际遇) */
export function encountersPerHour(): number {
  return 3600 / EXPLORE_BATTLE_INTERVAL
}

/** 每小时战斗场次(出际遇的那几次不算战斗) */
export function battlesPerHour(): number {
  return encountersPerHour() * (1 - EXPLORE_EVENT_CHANCE)
}

/** 每小时际遇次数 */
export function eventsPerHour(): number {
  return encountersPerHour() * EXPLORE_EVENT_CHANCE
}

/** 一场取胜的历练折算的等效闭关秒(未计出行方式/首领/福缘/增益等倍率) */
export function battleExpSecsAt(): number {
  return BATTLE_EXP_SECS
}

export function expIncomeAt(major: number): ExpIncomeRow {
  const idlePerHour = 3600
  const battlePerHour = battlesPerHour() * battleExpSecsAt()
  const eventPerHour = eventsPerHour() * TYPICAL_EVENT_EXP_SECS
  return { major, idlePerHour, battlePerHour, eventPerHour, ratio: (battlePerHour + eventPerHour) / idlePerHour }
}

export function expIncomeAudit(): ExpIncomeRow[] {
  const out: ExpIncomeRow[] = []
  for (let m = 0; m <= MAX_MAJOR; m += 1) out.push(expIncomeAt(m))
  return out
}
