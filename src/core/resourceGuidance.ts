/**
 * 道源/道果认知服务(Phase 30.9)
 *
 * 目标:让玩家在第一次看到道源/道果时,就知道
 *   道源 = 「此世消耗」的终局行动资源
 *   道果 = 「永久积累」的跨世成长资源
 *
 * 原则:不改经济,只改认知——名称语义/用途说明/即时因果解释/
 *       首次教学/软上限白话。全部为展示层与一次性标记。
 */
import { useEndgameStore } from '@/stores/endgame'
import { usePlayerStore } from '@/stores/player'
import { DAO_FRUIT_CULT_BONUS, DAO_FRUIT_SOFT_EXP } from '@/data/constants'

// ---------- S1 生命周期语义 ----------

/** 道源:本世消耗的终局行动资源 */
export const DAO_SOURCE_ROLE = '此世消耗' as const
/** 道果:跨世保留的长期成长资源 */
export const DAO_FRUIT_ROLE = '永久积累' as const

/** 道源用途一句话 */
export const DAO_SOURCE_USAGES = ['叩问天界诸界', '参加天道试炼', '献祭前尘杂物', '凝聚道果']
/** 道果用途一句话 */
export const DAO_FRUIT_USAGES = ['提升转世后的长期收益', '跨世保留,永不磨灭']

// ---------- S2 资源说明(弹窗内容,纯数据) ----------

export interface ResourceDialogData {
  name: string
  role: string
  /** 生命周期标签颜色语义 */
  roleTone: 'action' | 'permanent'
  intro: string
  usages: string[]
  gains: string[]
  lifecycle: string
}

export function daoSourceDialog(): ResourceDialogData {
  return {
    name: '道源',
    role: DAO_SOURCE_ROLE,
    roleTone: 'action',
    intro: '真仙之后用于叩问天道的资源。',
    usages: DAO_SOURCE_USAGES,
    gains: ['破界', '天道试炼', '天道挑战', '天道熔炉'],
    lifecycle: '本世使用,可通过凝道果转化为永久成长。'
  }
}

export function daoFruitDialog(): ResourceDialogData {
  const cultBonus = Math.round(DAO_FRUIT_CULT_BONUS * 100)
  return {
    name: '道果',
    role: DAO_FRUIT_ROLE,
    roleTone: 'permanent',
    intro: '跨越轮回仍不磨灭的修行成果。',
    usages: DAO_FRUIT_USAGES,
    gains: ['道源凝聚', '终局奖励'],
    lifecycle: `跨世保留。每枚:修行 +${cultBonus}%,道躯 +1.5%。`
  }
}

// ---------- S3 道源→道果视觉链路 ----------

/** 本次凝聚一枚道果后,当前有效道果收益变化(白话:边际收益) */
export function fruitMarginalInfo(): { total: number; effective: number; nextEffective: number; deltaPct: string } {
  const player = usePlayerStore()
  const fruit = player.reincarnation.daoFruit
  const eff = Math.pow(fruit, DAO_FRUIT_SOFT_EXP)
  const nextEff = Math.pow(fruit + 1, DAO_FRUIT_SOFT_EXP)
  // 下轮有效道果收益的增长率(当前为基础,展示边际递减)
  const delta = ((nextEff - eff) / Math.max(1, eff)) * 100
  return { total: fruit, effective: eff, nextEffective: nextEff, deltaPct: delta.toFixed(2) }
}

/** 道果软上限白话文案 */
export function fruitSoftCapText(total: number): string {
  if (total <= 0) return '尚未凝得道果。'
  if (total < 20) return '道果积累越多,每一枚新增道果带来的轮回收益越低(软上限)。'
  return '道果已逾二十:再增一枚,收益微乎其微,但仍是永久的。'
}

// ---------- S4/S5 首次教学 ----------

/** 首次进入天界教学(一次性) */
export function shouldShowEndgameTutorial(): boolean {
  const endgame = useEndgameStore()
  if (endgame.endgameTutorialSeen) return false
  // 触发条件:未见过教学,且已登真仙(随天界解锁)
  return usePlayerStore().major >= 9
}

export function markEndgameTutorialSeen(): void {
  useEndgameStore().endgameTutorialSeen = true
}

/** 首次凝道果(condenseDaoFruit 成功后调用),返回是否是首次 */
export function shouldShowFruitTutorial(): boolean {
  const endgame = useEndgameStore()
  if (endgame.daoFruitTutorialSeen) return false
  return true
}

export function markFruitTutorialSeen(): void {
  useEndgameStore().daoFruitTutorialSeen = true
}

/** 首次获得道源(用于 S6 埋点判断:提示"道源能干什么") */
export function firstDaoSourceHint(now: number): void {
  // 道源>0 且从未提示过:无害,只做埋点;提示融合在获得 toast 里
  void now
}

// ---------- S6 行为埋点(轻量) ----------

export interface ResourceCognitionStats {
  /** 道源总数 */
  daoSource: number
  /** 道果总数 */
  daoFruit: number
  /** 是否见过终局教学 */
  tutorialSeen: boolean
  /** 是否见过道果教学 */
  fruitSeen: boolean
  /** 是否打开过资源说明 */
  dialogSeen: boolean
}

export function cognitionStats(): ResourceCognitionStats {
  const endgame = useEndgameStore()
  const player = usePlayerStore()
  return {
    daoSource: endgame.daoSource,
    daoFruit: player.reincarnation.daoFruit,
    tutorialSeen: endgame.endgameTutorialSeen,
    fruitSeen: endgame.daoFruitTutorialSeen,
    dialogSeen: endgame.resourceDialogSeen
  }
}

export function markResourceDialogSeen(): void {
  useEndgameStore().resourceDialogSeen = true
}
