/**
 * 洞府灵脉 —— Phase 30.3
 * 六条灵脉平级:没有主脉/副脉之分,每条都可长期投资。
 *
 * 投资上限由**效果本身的数值上限**决定,不再另设灵脉规则:
 * 炼器耗材省到六成就封顶(强化成本钳在四成),再投也不再生效;
 * 修炼速度这类没有硬上限的效果则视作没有投资上限,只受灵石成本约束。
 */
import type { StatMods } from '@/types'

export type VeinId = 'gather' | 'craft' | 'alchemy' | 'insight' | 'fortune' | 'swift'

/**
 * 效果上限 —— 与各消费点自己钳制的那条硬线同源,不是灵脉另设的规矩。
 * 每条注明出处:改这里等于改消费点那条线,两边必须一起动。
 */
export const VEIN_EFFECT_CAPS = {
  /** pillService.craftPill: bonusChance + yieldMod 后 Math.min(0.8, …) */
  alchemyYield: 0.8,
  /** formulas.upgradeCost: factor = max(0.4, 1 − discount),即折扣封在 0.6 */
  forgeDiscount: 0.6,
  /** gongfaService.gongfaUpgradeCost: Math.min(0.5, insightDiscount) */
  insightDiscount: 0.5,
  /**
   * 气运 —— VEIN 专用的一条线,**不是消费点现有的硬上限**。
   *
   * luck 的消费点(equipGen.qualityWeightAt 的 1 + luck × 1.5)本来不钳制,
   * 而四条旧脉里也没有一条给气运封顶,于是气运是可以无限堆的。
   * 气运放大的是**稀有度**而非战力(不像暴击/闪避那样进战斗乘区),
   * 堆到几倍会把高品质权重整体掀起来,故在此单设一条上限。
   * 1.0 是取舍:满投之后 luck 把 rank≥3 的品质权重抬到 ×2.5,
   * 相当于「幸运全开」,再往上没有新的体验,只是让每一层都变简单。
   */
  fortuneLuck: 1.0
} as const

export type VeinEffectKey = keyof typeof VEIN_EFFECT_CAPS

export interface VeinDef {
  id: VeinId
  name: string
  seal: string
  desc: string
  /** 每点带来的属性加成(悟道脉走参悟折扣,不在此表) */
  perPoint: StatMods
  /**
   * 本脉效果所受的那条数值上限,读的是**同一个键**(悟道脉走专用折扣通道,
   * 其余走 perPoint 里的键)。null = 该效果没有硬上限,故本脉没有投资上限。
   */
  capKey: VeinEffectKey | null
}

export const VEINS: VeinDef[] = [
  {
    id: 'gather',
    name: '青木灵脉',
    seal: '聚',
    desc: '灵气汇流,修行事半功倍',
    perPoint: { cultivationSpeed: 0.004 },
    capKey: null // 修炼速度没有硬上限
  },
  {
    id: 'craft',
    name: '赤炎灵脉',
    seal: '炼',
    desc: '地火淬器,强化耗材更省',
    perPoint: { forgeDiscount: 0.003 },
    capKey: 'forgeDiscount'
  },
  {
    id: 'alchemy',
    name: '玉髓灵脉',
    seal: '丹',
    desc: '药气氤氲,炉中常出双丹',
    perPoint: { alchemyYield: 0.005 },
    capKey: 'alchemyYield'
  },
  {
    id: 'insight',
    name: '寒冥灵脉',
    seal: '悟',
    desc: '静水映月,参悟功法所费更少',
    perPoint: {},
    capKey: 'insightDiscount'
  },
  {
    id: 'fortune',
    name: '曜金灵脉',
    seal: '运',
    desc: '曜金辉光,天成之器多显真色',
    perPoint: { luck: 0.004 },
    capKey: 'fortuneLuck'
  },
  {
    id: 'swift',
    name: '疾风灵脉',
    seal: '疾',
    desc: '风疾过野,同程妖踪更密',
    perPoint: { explorationSpeed: 0.001 },
    // explorationSpeed 消费点(exploreBattleGapSec)不钳制,故无投资上限,只受灵石成本约束。
    // 每点压到 0.1%:到 1.0(等于间隔减半)需 1000 点,与旧脉同量级。
    capKey: null
  }
]

/** 悟道脉每点参悟折扣 */
export const INSIGHT_DISCOUNT_PER_POINT = 0.004
/** 与投资卡「当前加成」同一称呼,避免一条脉两个名字 */
export const INSIGHT_EFFECT_NAME = '参悟省耗'

export function veinDef(id: VeinId): VeinDef {
  return VEINS.find(v => v.id === id)!
}

/**
 * 某条脉的效果上限;null = 该效果没有上限,投点只受灵石成本约束。
 */
export function veinEffectCap(id: VeinId): number | null {
  const def = veinDef(id)
  return def.capKey === null ? null : VEIN_EFFECT_CAPS[def.capKey]
}
