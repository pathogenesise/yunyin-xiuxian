/**
 * 备份账目验收 —— 什么时候该提醒「导出一份」,什么时候闭嘴
 *
 * 提醒的价值全在**时机**:该说的时候不说,玩家在丢档之后才知道有这回事;不该说的时候
 * 乱说(刚建号第一分钟就劝备份),只会把提醒变成噪声,下次真出事没人理它。故两条判据:
 *   一 新档(攒不够 SAVE_WORTH_BACKUP_DAYS 天)一律不提醒,哪怕从没导出过
 *   二 老档 + 备份过旧(或从未导出)才提醒;刚导出的那次立刻闭嘴
 * 故障注入:把 shouldPromptBackup 里的存档天数判断去掉,第二条会立刻红 —— 它正是
 * 「不唠叨」这件事的唯一守卫。
 */
import { describe, expect, it } from 'vitest'
import {
  BACKUP_STALE_DAYS,
  SAVE_WORTH_BACKUP_DAYS,
  backupAdvice,
  daysSinceExport,
  formatLastExport,
  shouldPromptBackup
} from './saveBackup'

const DAY = 86400000
const NOW = Date.UTC(2026, 8, 15, 12, 0, 0)
const daysAgo = (n: number): number => NOW - n * DAY

describe('备份账目', () => {
  it('从没导出过:状态是 never,文案是「从未导出」', () => {
    expect(backupAdvice(0, NOW)).toBe('never')
    expect(daysSinceExport(0, NOW)).toBeNull()
    expect(formatLastExport(0, NOW)).toBe('从未导出')
  })

  it('刚导出 / 隔了几天 / 过了阈值:分档与文案', () => {
    expect(formatLastExport(NOW - 1000, NOW)).toBe('今天')
    expect(formatLastExport(daysAgo(1), NOW)).toBe('1 天前')
    expect(formatLastExport(daysAgo(13), NOW)).toBe('13 天前')
    expect(backupAdvice(daysAgo(BACKUP_STALE_DAYS - 1), NOW)).toBe('fresh')
    expect(backupAdvice(daysAgo(BACKUP_STALE_DAYS), NOW)).toBe('stale')
  })

  it('新档不唠叨:攒不够天数时,从没导出过也不提醒', () => {
    const newSave = daysAgo(1)
    expect(shouldPromptBackup(0, newSave, NOW)).toBe(false)
    expect(shouldPromptBackup(daysAgo(999), newSave, NOW)).toBe(false)
    // 边界:刚好攒够 3 天的那一档开始提醒
    expect(shouldPromptBackup(0, daysAgo(SAVE_WORTH_BACKUP_DAYS), NOW)).toBe(true)
  })

  it('老档才提醒,而且刚导出的那次立刻安静', () => {
    const oldSave = daysAgo(120)
    expect(shouldPromptBackup(0, oldSave, NOW)).toBe(true)
    expect(shouldPromptBackup(daysAgo(BACKUP_STALE_DAYS + 1), oldSave, NOW)).toBe(true)
    expect(shouldPromptBackup(daysAgo(BACKUP_STALE_DAYS - 1), oldSave, NOW)).toBe(false)
    expect(shouldPromptBackup(NOW, oldSave, NOW)).toBe(false)
  })

  it('时钟回拨 / 坏值不许算出负数天或整天提醒', () => {
    // 上次导出时间在「未来」(改过系统时间):按 0 天算,不要变成负数
    expect(daysSinceExport(NOW + 5 * DAY, NOW)).toBe(0)
    expect(backupAdvice(NOW + 5 * DAY, NOW)).toBe('fresh')
    // createdAt 是坏值(0)时不提醒
    expect(shouldPromptBackup(0, 0, NOW)).toBe(false)
    // 字段被写坏(非数字):按「从未导出」处理,不许把 NaN 渗到界面上变成「NaN 天前」
    const broken = 'abc' as unknown as number
    expect(daysSinceExport(broken, NOW)).toBeNull()
    expect(formatLastExport(broken, NOW)).toBe('从未导出')
    expect(shouldPromptBackup(broken, daysAgo(30), NOW)).toBe(true)
  })
})
