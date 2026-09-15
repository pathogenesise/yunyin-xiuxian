/**
 * 先手判定的粒度 —— 跨不过一档的加成,等于没给
 *
 * 先手判定是一条**阈值**(1 + 修正 ≥ 对手速度即抢先,见 core/combat.ts),
 * 而敌人的速度是**按 5% 一档**给的(0.90 / 0.95 / 1.00 / 1.05 …)。
 * 于是「先手判定 +3%」这种加成跨不过任何一档:对速度 1.00 的敌人,不堆也抢先;
 * 对 1.05 的敌人,+3% 与 +0% 一模一样。实测(ISS-195):132 只敌人里,
 * 无加成抢先 40 次,+3% 仍是 40 次,+6% 才 49 次 —— 最低那一档词条是摆设。
 *
 * 故这里给「先手判定」立一条粒度红线:**凡给它的来源,值必须跨得过一档**。
 * 词条看**最小值**(每一掷都得有用),功法看**满级总值**(逐层累加之后才算数),
 * 其余来源看给定值。故障注入:把迅捷改回 3–6、或给某件装备写 speed: 0.03,这里立刻红。
 */
import { describe, expect, it } from 'vitest'
import { AFFIXES } from '@/data/affixes'
import { ARTIFACTS } from '@/data/artifacts'
import { BUFFS } from '@/data/buffs'
import { ENEMIES } from '@/data/enemies'
import { EQUIPMENT_TEMPLATES } from '@/data/equipment'
import { GONGFA } from '@/data/gongfa'
import { GONGFA_BRANCHES } from '@/data/gongfaBranches'
import { PETS } from '@/data/pets'
import { TALENTS } from '@/data/talents'
import { TITLES } from '@/data/titles'

/** 敌人速度表的步长(data/enemies 的 mults[3] 只按它取档) */
const STEP = 0.05

describe('先手判定 · 每一处来源都得跨得过一档', () => {
  it('地基:敌人速度确实一档一档地给', () => {
    const speeds = ENEMIES.map(e => e.speed)
    const bands = new Set(speeds.map(s => Math.round(s / STEP)))
    expect(bands.size, '敌人速度只有一两档 —— 阈值判据就失去意义了').toBeGreaterThan(4)
    const offStep = [...new Set(speeds.filter(s => Math.abs(s / STEP - Math.round(s / STEP)) > 1e-9))]
    expect(offStep, `这些速度不在 ${STEP} 的档上,本判据的分档前提要跟着改`).toEqual([])
  })

  it('词条:最低一掷也要跨过一档', () => {
    const bad = AFFIXES.filter(a => a.key === 'speed' && a.min / 100 < STEP - 1e-9).map(
      a => `${a.name} 最低 ${a.min}%(低于一档)`
    )
    expect(bad, `先手判定词条的最低值跨不过任何一档,那一掷就是白掷:\n${bad.join('\n')}`).toEqual([])
  })

  it('装备固有:低于一档的 speed 是死数值', () => {
    const bad = EQUIPMENT_TEMPLATES.filter(t => {
      const v = t.fixedMods?.speed
      return v !== undefined && v > 0 && v < STEP - 1e-9
    }).map(t => `${t.name}(${t.tier} 阶) speed=${t.fixedMods!.speed}`)
    expect(bad, `这些装备写着先手加成,却跨不过任何一档:\n${bad.join('\n')}`).toEqual([])
  })

  it('法宝被动 / 功法满级 / 分支 / 天赋 / 称号 / 灵兽 / 状态:凡给 speed,都得跨过一档', () => {
    const bad: string[] = []
    const check = (where: string, value: number | undefined): void => {
      if (value !== undefined && value > 0 && value < STEP - 1e-9) bad.push(`${where} ${value}`)
    }
    for (const a of ARTIFACTS) check(`法宝「${a.name}」`, a.passive.speed)
    for (const g of GONGFA) {
      const total = (g.baseMods.speed ?? 0) + (g.perLevelMods.speed ?? 0) * (g.maxLevel - 1)
      check(`功法《${g.name}》满级`, total)
    }
    for (const b of GONGFA_BRANCHES) check(`分支「${b.name}」`, b.mods.speed)
    for (const t of TALENTS) check(`天赋「${t.name}」`, t.mods.speed)
    for (const t of TITLES) check(`称号「${t.name}」`, t.mods.speed)
    for (const p of PETS) check(`灵兽「${p.name}」`, p.mods.speed)
    for (const b of BUFFS) check(`状态「${b.name}」`, b.mods.speed)
    expect(bad, `这些先手加成跨不过任何一档,等于没给:\n${bad.join('\n')}`).toEqual([])
  })
})
