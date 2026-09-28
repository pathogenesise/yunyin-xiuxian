/**
 * 重铸与锁定提示 —— 词条条数、尘石仍报清。
 *
 * 「不足」太像账房;重铸改的是词条构成,不是出身。
 */
export function reforgeEmptyToast(): string {
  return '此物已无重铸余地'
}

export function reforgeShortToast(): string {
  return '灵石或器灵尘未足,难移天机'
}

export function reforgeLockedNote(count: number): string {
  return count > 0 ? `(锁定 ${count} 条未动)` : ''
}

export function reforgeDoneToast(countNote: string, lockedNote: string): string {
  return `天机重铸,词条 ${countNote}${lockedNote}`
}

export function lockShortToast(): string {
  return '灵石未足,难锁此纹'
}

export function lockDoneToast(name: string): string {
  return `「${name}」已锁定,重铸不移`
}

export function unlockDoneToast(name: string): string {
  return `「${name}」已解锁,重铸可再掷`
}
