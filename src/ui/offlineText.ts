/**
 * 离线归来文案 —— 「闭关」另有一条有时限、禁历练的增益。
 *
 * 离开游戏再回来,走的是 settleOffline,不是 startRetreat。
 * 卷轴上若写「闭关」,玩家会以为自己已经封洞,或反过来觉得闭关按钮没生效。
 */
export function offlineAwayPhrase(secondsText: string, cappedText?: string): string {
  if (cappedText) return `此去 ${secondsText}(收益按 ${cappedText} 结算)`
  return `此去 ${secondsText}`
}

export function offlineAgeNote(ageYears: number): string {
  return `此去寿元流逝 ${ageYears} 载`
}
