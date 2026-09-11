/**
 * 境界体系 —— 四大界域 · 21 大境界 × (九层 + 圆满)
 *
 * 界域与境界的对应(下标 = 大境界序号 major):
 *
 *   人间界 0-8   炼气 筑基 金丹 元婴 化神 炼虚 合体 大乘 渡劫
 *   仙界   9-13  真仙 玄仙 金仙 太乙 大罗        (自渡劫飞升入仙)
 *   神界   14-17 神人 神将 神王 神帝             (自大罗破界入神)
 *   混沌海 18-20 混沌真灵 混沌神魔 混沌道祖       (万界之始,大道的尽头)
 *
 * 兼容约束:0-9 号境界的 id/名称/寿元/劫数/desc 一律保持原值不动 ——
 * 既有存档、内容 gate(minRealm)、审计口径全部建立在旧下标上。
 * 新界只做「追加」,不改旧序号。
 *
 * 「真仙」是旧设计里的飞升终点(不渡劫),在新体系里它是仙界的门槛,
 * 于是这一境同时承担两重身份:人间的飞升之赏、仙界的第一层台阶。
 */
import type { RealmDef, WorldId } from '@/types'

export interface WorldDef {
  id: WorldId
  name: string
  desc: string
  /** 起始大境界序号(含) */
  start: number
  /** 结束大境界序号(含) */
  end: number
}

export const WORLDS: WorldDef[] = [
  { id: 'mortal', name: '人间界', desc: '凡尘俗世,修士自此处引气入体,一步步叩问长生', start: 0, end: 8 },
  { id: 'immortal', name: '仙界', desc: '飞升之地,仙灵之气充盈,一步一登天', start: 9, end: 13 },
  { id: 'god', name: '神界', desc: '神域之中,法则凝形,言出法随', start: 14, end: 17 },
  { id: 'chaos', name: '混沌海', desc: '万界之始,大道本源,与混沌同寿', start: 18, end: 20 }
]

export const REALMS: RealmDef[] = [
  // ---- 人间界 ----
  { id: 'lianqi', name: '炼气', world: 'mortal', lifespanYears: 150, tribulation: false, desc: '引气入体,踏上仙途', lore: '起点取网文最常见的「炼气」——吐纳导引、引气入体,对应道家「服气」之说;凡人由此入道,故名。', basis: '内丹' },
  { id: 'zhuji', name: '筑基', world: 'mortal', lifespanYears: 300, tribulation: true, desc: '筑道之基,凡躯渐蜕', lore: '承炼气。《周易参同契》讲「筑基炼己」,先把道基夯实,才谈得上结丹;故曰筑基。', basis: '内丹' },
  { id: 'jindan', name: '金丹', world: 'mortal', lifespanYears: 800, tribulation: true, desc: '丹成一粒,吞吐天地', lore: '承筑基。内丹术中「金丹」为药,张伯端《悟真篇》以金丹喻道;一粒丹成,可吞吐天地。', basis: '内丹' },
  { id: 'yuanying', name: '元婴', world: 'mortal', lifespanYears: 3000, tribulation: true, desc: '婴现顶门,神游太虚', lore: '承金丹。《性命圭旨》述「婴儿现形」,金丹化婴、顶门出窍,是为元婴。', basis: '内丹' },
  { id: 'huashen', name: '化神', world: 'mortal', lifespanYears: 10000, tribulation: true, desc: '神念化形,言出法随', lore: '承元婴。《性命圭旨》「炼气化神」,神念离体而化形,言出法随。', basis: '内丹' },
  { id: 'lianxu', name: '炼虚', world: 'mortal', lifespanYears: 30000, tribulation: true, desc: '炼神返虚,窥见大道', lore: '承化神。《性命圭旨》「炼神还虚」,即炼虚;形神渐与大道相通。', basis: '内丹' },
  { id: 'heti', name: '合体', world: 'mortal', lifespanYears: 100000, tribulation: true, desc: '身道相合,举念移山', lore: '承炼虚。内丹谓「形神俱妙」,身与道合、举念移山,是为合体。', basis: '内丹' },
  { id: 'dacheng', name: '大乘', world: 'mortal', lifespanYears: 300000, tribulation: true, desc: '大道将成,静候天命', lore: '承合体。取佛教「大乘」之名,大道将成、静候天命;世称大乘。', basis: '佛道' },
  { id: 'dujie', name: '渡劫', world: 'mortal', lifespanYears: 1000000, tribulation: true, desc: '九重雷海,向死而生', lore: '承大乘。《云笈七签》有雷劫之说,修至尽头须历九重雷海,向死而生,故曰渡劫。', basis: '佛道' },
  // ---- 仙界 ----
  { id: 'zhenxian', name: '真仙', world: 'immortal', lifespanYears: 99999999, tribulation: false, desc: '超脱轮回,与道同存', lore: '承渡劫。《钟吕传道集》分仙为五等,天仙之上为真仙;飞升入天,与道同存。', basis: '道教仙阶' },
  { id: 'xuanxian', name: '玄仙', world: 'immortal', lifespanYears: 300000000, tribulation: true, desc: '仙体玄妙,一念山河', lore: '承真仙。取其「玄」字(《道德经》「玄之又玄」),仙体玄妙,一念山河。', basis: '道教仙阶' },
  { id: 'jinxian', name: '金仙', world: 'immortal', lifespanYears: 1000000000, tribulation: true, desc: '金性不朽,历劫不磨', lore: '承玄仙。道教称「金仙」为历劫不磨之仙,金性不朽,故名。', basis: '道教仙阶' },
  { id: 'taiyi', name: '太乙', world: 'immortal', lifespanYears: 5000000000, tribulation: true, desc: '太乙近道,万法归流', lore: '承金仙。取道教「太乙」(太乙救苦天尊)与网文近道之阶,谓太乙近道、万法归流。', basis: '道教仙阶' },
  { id: 'daluo', name: '大罗', world: 'immortal', lifespanYears: 20000000000, tribulation: true, desc: '大罗金仙,逍遥三界', lore: '承太乙。道教以「大罗天」为最高天界,居其上者为大罗金仙;逍遥三界,故名大罗。', basis: '道教仙阶' },
  // ---- 神界 ----
  { id: 'shenren', name: '神人', world: 'god', lifespanYears: 100000000000, tribulation: true, desc: '神光照世,超脱仙凡', lore: '承大罗。《庄子·逍遥游》「藐姑射之山,有神人居焉」——超脱仙身、入神界之始,故名神人。', basis: '道家本源' },
  { id: 'shenjiang', name: '神将', world: 'god', lifespanYears: 500000000000, tribulation: true, desc: '执掌神兵,代天行罚', lore: '承神人。神界阶位常见「神将」,执掌神兵、代天行罚。', basis: '网文' },
  { id: 'shenwang', name: '神王', world: 'god', lifespanYears: 2000000000000, tribulation: true, desc: '神域之主,言出法随', lore: '承神将。神域之主为神王,言出法随,一方神域皆循其名。', basis: '网文' },
  { id: 'shendi', name: '神帝', world: 'god', lifespanYears: 10000000000000, tribulation: true, desc: '神帝临尘,众神俯首', lore: '承神王。众神之极曰神帝,神帝临尘,众神俯首。', basis: '网文' },
  // ---- 混沌海 ----
  { id: 'hundunling', name: '混沌真灵', world: 'chaos', lifespanYears: 50000000000000, tribulation: true, desc: '混沌初开,一点真灵不昧', lore: '承神帝。《三五历纪》「天地混沌如鸡子」——混沌初开,一点真灵不昧,故名混沌真灵。', basis: '道家本源' },
  { id: 'hundunshenmo', name: '混沌神魔', world: 'chaos', lifespanYears: 200000000000000, tribulation: true, desc: '神魔一体,开天辟地', lore: '承混沌真灵。开天辟地之象:神魔一体,以身开界,故名混沌神魔。', basis: '道家本源' },
  { id: 'hundundaozu', name: '混沌道祖', world: 'chaos', lifespanYears: 1000000000000000, tribulation: true, desc: '万道之祖,与混沌同寿', lore: '承混沌神魔。《道德经》「道生一」——万道之祖,与混沌同寿,是为混沌道祖,亦为全境之极。', basis: '道家本源' }
]

export const MAX_MAJOR = REALMS.length - 1

/**
 * 仙界起点(飞升门槛)。
 * 天界终局内容(道途/远征/试炼/熔炉)以此为准 —— 不再借用「满级」表示,
 * 否则日后每加一境,终局门槛都会跟着漂移。
 */
export const WORLD_BREAK_MAJOR = 9

/**
 * 轮回(道果 / 天赋)经济的参照终点。
 *
 * 玩家实测多在元婴~合体之间就转世,「修满一世」的口径历来以飞升真仙为准;
 * 仙界/神界/混沌海是同一世内的长线攀登,属于另一套经济。
 * 轮回 ROI / 道果曲线一族审计以本值为基线,避免日后每加一境都要重算一遍参考量。
 */
export const REBIRTH_REFERENCE_MAJOR = WORLD_BREAK_MAJOR

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

const WORLD_BY_ID = new Map(WORLDS.map(w => [w.id, w]))

export function worldDef(id: WorldId): WorldDef {
  return WORLD_BY_ID.get(id) ?? WORLDS[0]!
}

/** 该大境界所属界域 */
export function worldOf(major: number): WorldDef {
  const m = Math.max(0, Math.min(MAX_MAJOR, major))
  return WORLDS.find(w => m >= w.start && m <= w.end) ?? WORLDS[WORLDS.length - 1]!
}

/** 该大境界是否为所在界域的第一境(跨界那一境) */
export function isWorldEntry(major: number): boolean {
  return worldOf(major).start === Math.max(0, Math.min(MAX_MAJOR, major))
}
