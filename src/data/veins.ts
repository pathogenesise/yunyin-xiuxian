/**
 * 洞府灵脉 —— Phase 30.3
 * 一条主脉(70 点)+ 若干副脉(各 ≤30 点),总容量 100:不能全部点满,方向即取舍。
 */
import type { StatMods } from '@/types'

export type VeinId = 'gather' | 'craft' | 'alchemy' | 'insight'

export interface VeinDef {
  id: VeinId
  name: string
  seal: string
  desc: string
  /** 每点带来的属性加成(悟道脉走参悟折扣,不在此表) */
  perPoint: StatMods
  /** 每点效果文案(x = 点数) */
  effectText: (points: number) => string
}

export const VEINS: VeinDef[] = [
  {
    id: 'gather',
    name: '青木灵脉',
    seal: '聚',
    desc: '灵气汇流,修行事半功倍',
    perPoint: { cultivationSpeed: 0.004 },
    effectText: p => `修炼速度 +${(p * 0.4).toFixed(1)}%`
  },
  {
    id: 'craft',
    name: '赤炎灵脉',
    seal: '炼',
    desc: '地火淬器,强化耗材更省',
    perPoint: { forgeDiscount: 0.003 },
    effectText: p => `炼器耗材 -${(p * 0.3).toFixed(1)}%`
  },
  {
    id: 'alchemy',
    name: '玉髓灵脉',
    seal: '丹',
    desc: '药气氤氲,炉中常出双丹',
    perPoint: { alchemyYield: 0.005 },
    effectText: p => `炼丹双成率 +${(p * 0.5).toFixed(1)}%`
  },
  {
    id: 'insight',
    name: '寒冥灵脉',
    seal: '悟',
    desc: '静水映月,参悟功法所费更少',
    perPoint: {},
    effectText: p => `功法进修悟道点 -${(p * 0.4).toFixed(1)}%`
  }
]

/** 悟道脉每点参悟折扣 */
export const INSIGHT_DISCOUNT_PER_POINT = 0.004

export function veinDef(id: VeinId): VeinDef {
  return VEINS.find(v => v.id === id)!
}
