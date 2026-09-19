/**
 * 主页状态行 —— 只报玩家此刻真正处在的状态。
 *
 * 「闭关」是一条有时限、禁历练的增益,不是默认挂机。把静修一律写成闭关,
 * 玩家会以为自己已经封洞、出不去,或者反过来觉得闭关按钮没生效。
 */
export interface HomePresence {
  dead: boolean
  /** 正在历练会话中(与闭关互斥,由探索入口守卫) */
  adventuring: boolean
  regionName: string
  injured: boolean
  retreating: boolean
  expFull: boolean
}

export function homeStatusText(p: HomePresence): string {
  if (p.dead) return '陨落'
  if (p.adventuring) return `历练中 · ${p.regionName}`
  if (p.injured) return '疗伤中'
  if (p.retreating) return '闭关中'
  if (p.expFull) return '修为已满'
  return '修炼中'
}
