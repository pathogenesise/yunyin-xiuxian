/**
 * 存档备份的账 —— 上次导出是什么时候,这份备份还新不新
 *
 * 为什么值得单独算这笔账:存档只在本机(iOS 上还会被系统清),导出是唯一的保险,
 * 但「导出」是个没人提醒就不会做的动作 —— 玩家往往在丢档之后才想起它。故设置页
 * 常驻一行「上次导出备份:…」,并在这份备份已经太旧、而这一档又确实攒了东西时提醒
 * 一次。全是纯函数:判据直接喂各种时间点进来验。
 */

/** 超过这么多天没导出,就认为这份备份「旧了」 */
export const BACKUP_STALE_DAYS = 14

/** 存档本身要攒够这些天,才值得开口劝备份 —— 新开一天的档没什么可丢的,别唠叨 */
export const SAVE_WORTH_BACKUP_DAYS = 3

export type BackupAdvice = 'never' | 'stale' | 'fresh'

/** 上次导出距现在几天(不满一天算一天;没导出过返回 null) */
export function daysSinceExport(lastExportAt: number, now: number): number | null {
  // 坏档防线:这个字段来自持久化,可能被写成一串字符 —— NaN 会一路渗到界面上变成
  // 「NaN 天前」。sanitize 会修它,但界面不该赌 sanitize 已经跑过。
  if (!Number.isFinite(lastExportAt) || lastExportAt <= 0) return null
  if (!Number.isFinite(now)) return null
  return Math.max(0, Math.floor((now - lastExportAt) / 86400000))
}

/** 这份备份的状态:从未导出 / 旧了 / 还新 */
export function backupAdvice(lastExportAt: number, now: number): BackupAdvice {
  const days = daysSinceExport(lastExportAt, now)
  if (days === null) return 'never'
  return days >= BACKUP_STALE_DAYS ? 'stale' : 'fresh'
}

/**
 * 该不该把「建议导出」这句话说出口。
 *
 * 两个条件:备份旧了(或压根没导过),**且**这一档已经攒了几天 —— 否则新建号第一分钟
 * 就被劝备份,只会把人劝烦。
 */
export function shouldPromptBackup(lastExportAt: number, saveCreatedAt: number, now: number): boolean {
  if (backupAdvice(lastExportAt, now) === 'fresh') return false
  const saveDays = (now - saveCreatedAt) / 86400000
  return saveCreatedAt > 0 && saveDays >= SAVE_WORTH_BACKUP_DAYS
}

/** 设置页那一行的文本 */
export function formatLastExport(lastExportAt: number, now: number): string {
  const days = daysSinceExport(lastExportAt, now)
  if (days === null) return '从未导出'
  if (days === 0) return '今天'
  return `${days} 天前`
}
