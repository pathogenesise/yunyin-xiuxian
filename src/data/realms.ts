/** 境界体系 —— 10 大境界 × (九层 + 圆满) */
import type { RealmDef } from '@/types'

export const REALMS: RealmDef[] = [
  { id: 'lianqi', name: '炼气', lifespanYears: 150, tribulation: false, desc: '引气入体,踏上仙途' },
  { id: 'zhuji', name: '筑基', lifespanYears: 300, tribulation: true, desc: '筑道之基,凡躯渐蜕' },
  { id: 'jindan', name: '金丹', lifespanYears: 800, tribulation: true, desc: '丹成一粒,吞吐天地' },
  { id: 'yuanying', name: '元婴', lifespanYears: 3000, tribulation: true, desc: '婴现顶门,神游太虚' },
  { id: 'huashen', name: '化神', lifespanYears: 10000, tribulation: true, desc: '神念化形,言出法随' },
  { id: 'lianxu', name: '炼虚', lifespanYears: 30000, tribulation: true, desc: '炼神返虚,窥见大道' },
  { id: 'heti', name: '合体', lifespanYears: 100000, tribulation: true, desc: '身道相合,举念移山' },
  { id: 'dacheng', name: '大乘', lifespanYears: 300000, tribulation: true, desc: '大道将成,静候天命' },
  { id: 'dujie', name: '渡劫', lifespanYears: 1000000, tribulation: true, desc: '九重雷海,向死而生' },
  { id: 'zhenxian', name: '真仙', lifespanYears: 99999999, tribulation: false, desc: '超脱轮回,与道同存' }
]

export const MAX_MAJOR = REALMS.length - 1

export const SUB_NAMES = ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层', '圆满'] as const

export function realmDef(major: number): RealmDef {
  return REALMS[Math.max(0, Math.min(MAX_MAJOR, major))]!
}

/** 完整境界名,如「金丹·三层」 */
export function realmLabel(major: number, sub: number): string {
  const r = realmDef(major)
  const s = SUB_NAMES[Math.max(0, Math.min(SUB_NAMES.length - 1, sub))]
  return `${r.name}·${s}`
}
