/**
 * 洞府营造提示 —— 起造与再进。
 *
 * 卡片上的拒绝原因与 toast 同源。写成「不足」「升至 N 级」太硬,
 * 但境界、层数、灵石玄铁仍得报清。
 */
export function buildingRealmGate(realmName: string): string {
  return `未至${realmName}境,难营此筑`
}

export function buildingPeakToast(): string {
  return '此筑已至层巅'
}

export function buildingMansionGateToast(): string {
  return '洞府未广,此筑难再升'
}

export function buildingShortToast(): string {
  return '灵石或玄铁未足,难营此工'
}

export function buildingDoneToast(name: string, level: number): string {
  return `「${name}」营造再进,已至 ${level} 级`
}
