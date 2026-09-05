/** 称号 —— 由成就解锁,可佩戴一枚 */
import type { TitleDef } from '@/types'

export const TITLES: TitleDef[] = [
  { id: 'ti_churu', name: '初入仙途', desc: '踏出修行第一步', mods: { cultivationSpeed: 0.02 } },
  { id: 'ti_lianqi', name: '炼气修士', desc: '于炼气境站稳脚跟', mods: { cultivationSpeed: 0.03 } },
  { id: 'ti_zhuji', name: '筑基真人', desc: '筑就大道之基', mods: { cultivationSpeed: 0.04, maxHpPct: 0.03 } },
  { id: 'ti_jindan', name: '金丹老祖', desc: '丹成之日,山呼海啸', mods: { cultivationSpeed: 0.05, attackPct: 0.04 } },
  { id: 'ti_yuanying', name: '元婴大能', desc: '元婴一出,谁与争锋', mods: { cultivationSpeed: 0.06, breakthroughRate: 0.01 } },
  { id: 'ti_slayer', name: '百兽辟易', desc: '斩妖除魔数百计', mods: { attackPct: 0.06 } },
  { id: 'ti_wanfa', name: '一剑破万法', desc: '击败十位区域之主', mods: { attackPct: 0.08, critRate: 0.02 } },
  { id: 'ti_tianjiao', name: '天命之人', desc: '获得一件天品以上装备', mods: { luck: 0.05, dropRate: 0.04 } },
  { id: 'ti_baolian', name: '百炼成钢', desc: '强化装备百次', mods: { defensePct: 0.06 } },
  { id: 'ti_danwang', name: '丹道圣手', desc: '炼丹百炉不辍', mods: { alchemyYield: 0.1 } },
  { id: 'ti_zhuanshi', name: '轮回行者', desc: '历经一次轮回', mods: { cultivationSpeed: 0.05, expGain: 0.05 } },
  { id: 'ti_changsheng', name: '万古长生', desc: '寿元逾万载', mods: { lifespanPct: 0.1 } }
]

const BY_ID = new Map(TITLES.map(x => [x.id, x]))

export function titleDef(id: string): TitleDef | undefined {
  return BY_ID.get(id)
}
