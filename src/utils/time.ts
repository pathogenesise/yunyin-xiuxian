/** 时间工具 */

export function now(): number {
  return Date.now()
}

/** 本地日期字符串,用于每日任务重置 */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * 本地日整数(YYYYMMDD),用于「每日一次」类闸门。
 *
 * 与 todayStr 同一本地日口径:洞府巡游、日课都该跟着玩家墙上的日历走,
 * 而不是 UTC 日(UTC+8 玩家在本地 16:00 就被翻到"明天",同一本地日能白嫖两次巡游)。
 */
export function todayLocalNum(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** 时间戳 → 可读「M月D日」 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
