/**
 * 丹药提示 —— 服用与开炉。
 *
 * 入口、成丹、炸炉都是高频短句。账房口吻(不足、炼成 ×1)太硬,
 * 但药力与枚数仍得报清,否则玩家不知这一口换来什么。
 */
export function pillGoneToast(): string {
  return '囊中无此丹'
}

export function pillTakenToast(name: string, effects: string): string {
  return `服下「${name}」,${effects || '药力温养周身'}`
}

export function craftShortToast(): string {
  return '灵草或灵石未足,难开此炉'
}

export function craftOkToast(name: string, extra: boolean): string {
  return extra ? `一炉双丹,「${name}」品相极佳` : `炉开丹成,得「${name}」一枚`
}
