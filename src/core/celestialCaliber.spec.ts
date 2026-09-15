/* eslint-disable no-console -- 体检表就是给人看的(与 celestialSim.spec 同一风格) */
/**
 * 天界敌我口径审计 —— 两套内容不许按两套尺子造敌
 *
 * 起因(DEC-030 一直"暂缓"、HYP-086 存疑):远征/挑战按 `finalStats`(含凡界装备)造敌,
 * 而玩家在天界是按 `celestialStats` 出手的 —— 凡器数值早被器魂抹平。后果是一条倒挂:
 *
 *   **凡界装备越好,天界敌人越强,而玩家一点没变强。**
 *
 * 实测(真仙 · 赤炎天 · 同一敌人形状):
 *   凡界装备 无 → 中 → 满:玩家天界三维恒为 7.53e7,
 *   敌人攻击却从 5.57e7 涨到 7.17e7(+29%);敌人词条也没乘 celestialDepthScale。
 *
 * 本文件钉住修复后的契约(参照与加厚都收进 gauntlet.celestialFoeCaliber):
 *   一 凡界装备再怎么堆,天界敌人的三维**一点不许动**(倒挂红线);
 *   二 超过基准深度的构筑,敌人词条按 celestialDepthScale 加厚(堆厚度不占便宜);
 *   三 远征与挑战都不许再拿 finalStats 当参照(源码级,防止有人"顺手改回去")。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { usePlayerStore } from '@/stores/player'
import { useInventoryStore } from '@/stores/inventory'
import { useEndgameStore } from '@/stores/endgame'
import { celestialDepthScale, celestialFoeCaliber, worldFoeSnap } from './gauntlet'
import { stackedMods } from './daoDepth'
import { CELESTIAL_WORLDS } from '@/data/endgame'
import { gn, toNum } from '@/utils/gnum'
import type { StatMods } from '@/types'

const GEAR = {
  无: { items: [], equipped: {} },
  中: {
    items: [{ uid: 'a', templateId: 'w_zidian', quality: 'earth', tier: 10, level: 2, affixes: [{ id: 'atk1', roll: 1 }, { id: 'crit1', roll: 1 }] }],
    equipped: { weapon: 'a' }
  },
  满: {
    items: [
      { uid: 'a', templateId: 'w_zidian', quality: 'heaven', tier: 14, level: 5, affixes: [{ id: 'atk4', roll: 1 }, { id: 'crit4', roll: 1 }, { id: 'dmg3', roll: 1 }, { id: 'cdmg4', roll: 1 }] },
      { uid: 'b', templateId: 'b_xingluo', quality: 'heaven', tier: 14, level: 5, affixes: [{ id: 'def4', roll: 1 }, { id: 'hp4', roll: 1 }, { id: 'red3', roll: 1 }] }
    ],
    equipped: { weapon: 'a', body: 'b' }
  }
} as const

/** 摆一个真仙档:器魂已在身(故天界三维与凡界装备无关) */
function celestialAccount(): void {
  const player = usePlayerStore()
  const eg = useEndgameStore()
  player.major = 12
  player.sub = 5
  eg.souls = [
    { uid: 's1', type: 'fengmang', grade: 3, fromName: '旧剑' },
    { uid: 's2', type: 'gangdun', grade: 3, fromName: '虎符' }
  ] as never
  eg.equippedSouls = ['s1', 's2']
}

function wearGear(key: keyof typeof GEAR): void {
  const inv = useInventoryStore()
  inv.items = GEAR[key].items as never
  inv.equipped = GEAR[key].equipped as never
}

describe('天界口径 · 倒挂红线', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const world = CELESTIAL_WORLDS[0]!
  const shape = world.foes[0]!

  it('凡界装备 无→中→满:玩家天界三维不变,敌人三维也必须不变', () => {
    celestialAccount()
    const rows: { gear: string; playerAtk: number; foeAtk: number; foeHp: number }[] = []
    for (const key of ['无', '中', '满'] as const) {
      wearGear(key)
      const player = usePlayerStore()
      const { ref, depth } = celestialFoeCaliber(player.celestialStats)
      const foe = worldFoeSnap(shape, ref, 1, depth)
      rows.push({
        gear: key,
        playerAtk: toNum(player.celestialStats.attack),
        foeAtk: toNum(foe.attack),
        foeHp: toNum(foe.maxHp)
      })
    }
    console.log('\n凡界装备      玩家天界攻击      敌人攻击        敌人气血')
    for (const r of rows) {
      console.log(`${r.gear.padEnd(8)}    ${r.playerAtk.toExponential(3)}   ${r.foeAtk.toExponential(3)}   ${r.foeHp.toExponential(3)}`)
    }
    /**
     * 判据用比率而不是"完全相等":玩家侧还有一处**已知残差** —— celestialStats 仍带
     * inventory.equipFlats(装备的平铺三维,词条才被器魂替换),实测满装 +0.07%。
     * 要彻底抹平得改 celestialStats 本身(动的是玩家在天界的战力),另立案。
     * 这里钉的是量级:凡界装备不许再把天界敌人推高哪怕一个百分点。
     */
    const spread = (xs: number[]): number => Math.max(...xs) / Math.min(...xs) - 1
    const playerSpread = spread(rows.map(r => r.playerAtk))
    const foeSpread = spread(rows.map(r => r.foeAtk))
    expect(playerSpread, `玩家天界攻击随凡界装备变了 ${(playerSpread * 100).toFixed(2)}%`).toBeLessThan(0.005)
    expect(foeSpread, `敌人跟着凡界装备变强了 ${(foeSpread * 100).toFixed(2)}%(倒挂:修复前是 29%)`).toBeLessThan(0.005)
    expect(spread(rows.map(r => r.foeHp))).toBeLessThan(0.005)
  })

  it('堆厚度不再占便宜:超过基准深度的构筑,敌人词条按 celestialDepthScale 加厚', () => {
    celestialAccount()
    const deep: StatMods = { attackPct: 0.4, damageBonus: 0.4, critRate: 0.25, critDamage: 0.6, defensePct: 0.25, maxHpPct: 0.35, damageReduction: 0.15 }
    const player = usePlayerStore()
    // 与玩家自身词条叠加,越过 CELESTIAL_BASE_DEPTH(2.6)—— 单靠一组合成词条还不够厚
    const thickMods = stackedMods(player.celestialStats.mods, deep, 3)
    const shallow = celestialDepthScale({})
    const thick = celestialDepthScale(thickMods)
    expect(shallow, '浅构筑不该被反削').toBe(1)
    expect(thick, '越过基准深度就该加厚').toBeGreaterThan(1)

    const modded = { ...shape, mods: { dodgeRate: 0.2, damageReduction: 0.2 } }
    const ref = { attack: gn(100), defense: gn(55), maxHp: gn(1400) }
    const withDepth = worldFoeSnap(modded, ref, 1, thick)
    const noDepth = worldFoeSnap(modded, ref, 1, 1)
    expect(withDepth.mods!.dodgeRate!).toBeCloseTo(0.2 * thick, 10)
    expect(withDepth.mods!.damageReduction!).toBeCloseTo(0.2 * thick, 10)
    expect(noDepth.mods!.dodgeRate, '不加厚的旧口径就是原样').toBeCloseTo(0.2, 10)
  })
})

describe('天界口径 · 源码级(远征与挑战不许再退回 finalStats)', () => {
  const src = (file: string): string =>
    readFileSync(resolve(__dirname, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

  it('远征:造敌参照走 celestialFoeCaliber,且逐处带上加厚系数', () => {
    const code = src('expedition.ts')
    expect(code, '远征必须用统一口径造敌').toContain('celestialFoeCaliber(player.celestialStats)')
    // worldFoeSnap 的每一次调用都该把 depth 传进去(预估与实战都不例外)
    const calls = [...code.matchAll(/worldFoeSnap\(([^\n]*)\)/g)].map(m => m[1]!)
    const playerRefCalls = calls.filter(c => !c.includes('SIM_REFERENCE'))
    expect(playerRefCalls.length).toBeGreaterThan(0)
    for (const c of playerRefCalls) {
      expect(c, `这次造敌没带加厚系数:worldFoeSnap(${c})`).toMatch(/depth|pDepth/)
    }
  })

  it('挑战:同样走 celestialFoeCaliber', () => {
    const code = src('challenge.ts')
    expect(code).toContain('celestialFoeCaliber(player.celestialStats)')
    expect(code, '挑战的敌人不许再按 finalStats 造').not.toMatch(/const ref = \{ attack: stats\.attack/)
  })
})
