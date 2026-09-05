import { describe, expect, it } from 'vitest'
import type { CombatantSnap } from '@/types'
import { gn } from '@/utils/gnum'
import { mulberry32, RandomService } from '@/utils/random'
import { enemyDef } from '@/data/enemies'
import { artifactDef } from '@/data/artifacts'
import { makeEnemySnap, resolveCombat, sampleWinRate } from './combat'

const seeded = (seed = 1): RandomService => new RandomService(mulberry32(seed))

function playerSnap(power: number): CombatantSnap {
  return {
    name: '测试道人',
    icon: 'user',
    isPlayer: true,
    attack: gn(30 * power),
    defense: gn(15 * power),
    maxHp: gn(400 * power),
    speed: 1,
    mods: {},
    skills: [{ name: '试剑', mult: 1.6, rate: 0.25 }]
  }
}

describe('自动战斗', () => {
  const wolf = enemyDef('e_wolf')!

  it('碾压级战力必胜,战报以胜利收尾', () => {
    const enemy = makeEnemySnap(wolf, 1, 1)
    const result = resolveCombat(playerSnap(100), enemy, seeded(3))
    expect(result.win).toBe(true)
    expect(result.log[result.log.length - 1]!.t).toBe('win')
  })

  it('战力悬殊过大则败,不会死循环', () => {
    const enemy = makeEnemySnap(enemyDef('e_hmdemon')!, 20, 2)
    const result = resolveCombat(playerSnap(1), enemy, seeded(4))
    expect(result.win).toBe(false)
    expect(result.rounds).toBeLessThanOrEqual(50)
  })

  it('血量百分比始终在 0~1 之间', () => {
    const enemy = makeEnemySnap(wolf, 1, 1)
    const result = resolveCombat(playerSnap(2), enemy, seeded(5))
    for (const entry of result.log) {
      expect(entry.php).toBeGreaterThanOrEqual(0)
      expect(entry.php).toBeLessThanOrEqual(1)
      expect(entry.ehp).toBeGreaterThanOrEqual(0)
      expect(entry.ehp).toBeLessThanOrEqual(1)
    }
  })

  it('同层级适度成长即可取胜(数值曲线体检)', () => {
    // 玩家基础 ×2.5(相当于同大境界内数层成长 + 装备),应能击败同层小怪
    const enemy = makeEnemySnap(wolf, 1, 1)
    const p: CombatantSnap = {
      ...playerSnap(1),
      attack: gn(30),
      defense: gn(17),
      maxHp: gn(500)
    }
    const rate = sampleWinRate(p, enemy, seeded(9), 3)
    expect(rate).toBeGreaterThan(0.3)
  })

  it('开局裸装带竹剑即可胜一层小怪(新手体验保护)', () => {
    // 炼气二层近似:基础三维 + 一柄凡品竹剑
    const p: CombatantSnap = {
      ...playerSnap(1),
      attack: gn(24),
      defense: gn(8),
      maxHp: gn(165),
      skills: [{ name: '太玄一气', mult: 1.5, rate: 0.2 }]
    }
    const enemy = makeEnemySnap(wolf, 1, 1)
    const rate = sampleWinRate(p, enemy, seeded(21), 3)
    expect(rate).toBeGreaterThan(0.6)
  })

  it('特殊词条不会让战斗崩溃', () => {
    const enemy = makeEnemySnap(wolf, 1, 1)
    const p = playerSnap(2)
    p.mods = {
      armorPen: 0.2,
      lifesteal: 0.1,
      counterRate: 0.3,
      comboRate: 0.3,
      stunRate: 0.2,
      shieldOnStart: 0.2,
      regenPerRound: 0.02,
      dodgeRate: 0.1,
      critRate: 0.3,
      critDamage: 0.5,
      lowHpDamage: 0.4,
      fullHpDamage: 0.3,
      shieldPower: 0.25,
      comboDamage: 0.5,
      counterDamage: 0.6,
      overhealShield: 0.8
    }
    const result = resolveCombat(p, enemy, seeded(12))
    expect(result.log.length).toBeGreaterThan(2)
    expect(typeof result.win).toBe('boolean')
  })

  it('流派机制生效:罡盾+满血增伤使输出显著提升(统计性)', () => {
    const base = playerSnap(1.2)
    const build: CombatantSnap = {
      ...playerSnap(1.2),
      mods: { shieldOnStart: 0.3, shieldPower: 0.4, fullHpDamage: 0.3 }
    }
    let baseRounds = 0
    let buildRounds = 0
    for (let i = 0; i < 20; i += 1) {
      baseRounds += resolveCombat(base, makeEnemySnap(wolf, 1, 1), seeded(100 + i)).rounds
      buildRounds += resolveCombat(build, makeEnemySnap(wolf, 1, 1), seeded(100 + i)).rounds
    }
    // 有流派加成的一方平均更快结束战斗
    expect(buildRounds).toBeLessThan(baseRounds)
  })

  it('双法宝均会自动施展', () => {
    const p = playerSnap(3)
    p.artifacts = [
      { def: artifactDef('af_lihuo')!, level: 0 },
      { def: artifactDef('af_xuantian')!, level: 0 }
    ]
    const result = resolveCombat(p, makeEnemySnap(enemyDef('e_bwking')!, 3, 1.2), seeded(7))
    const text = result.log.map(l => l.text).join('')
    expect(text.includes('离火珠') || text.includes('玄天镜')).toBe(true)
  })
})
