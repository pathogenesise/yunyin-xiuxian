/**
 * 法宝效果的两个承诺 —— 词汇表不虚设,震慑真打断
 *
 * 一、**声明即承诺**:ArtifactEffect 联合里写下的每种效果,都得有法宝在用。
 *     高界法宝此前一律是 damage/heal/shield/weaken 四种的数值放大(32 件里没有
 *     一件是别的手艺),于是「更高境界的法宝」只是打得更疼 —— 与「纯数值阶梯」
 *     是同一个毛病。本轮新增 { type: 'stun' },这条判据守着它别成为一纸空文。
 *
 * 二、**效果要真的发生**:震慑不是文案 —— 它在敌人该出手时把那一手掐掉。
 *     故这里真打一场(仙琴每 4 回合摄神),数敌人的「被打断回合」。
 *
 * 故障注入:把仙琴的 stun 换回 weaken,两条同时红。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTIFACTS, artifactDef } from '@/data/artifacts'
import { RandomService, mulberry32 } from '@/utils/random'
import { gn } from '@/utils/gnum'
import { MITIGATION_K } from '@/data/constants'
import { mulN } from '@/utils/gnum'
import { resolveCombat, makeEnemySnap } from './combat'
import { buildPlayerSnap } from './playerSnap'
import { enemyDef } from '@/data/enemies'

const seeded = (seed = 1): RandomService => new RandomService(mulberry32(seed))

/**
 * 一只「厚甲但打不死人」的靶子:防御让减伤落在五成上下(不是被上限压死),
 * 气血够厚到能撑过十个回合 —— 这样破甲带来的有效伤害提升才量得出来。
 */
function tankyWolf(): ReturnType<typeof makeEnemySnap> {
  const snap = makeEnemySnap(enemyDef('e_wolf')!, 1, 1)
  snap.attack = gn(1)
  snap.defense = mulN(gn(1e6), MITIGATION_K) // 减伤 ≈ 50%
  snap.maxHp = gn(6e6)
  snap.speed = 1
  snap.mods = {}
  return snap
}

/** 从类型声明里扫出 ArtifactEffect 的判别值 —— 手写联合,只能扫源码 */
function effectTypesFromTypes(): string[] {
  const src = readFileSync(resolve(__dirname, '../types/index.ts'), 'utf8')
  const start = src.indexOf('export type ArtifactEffect =')
  expect(start, 'types/index.ts 里找不到 ArtifactEffect').toBeGreaterThanOrEqual(0)
  const block = src.slice(start, src.indexOf('export interface ArtifactDef', start))
  return [...new Set([...block.matchAll(/type:\s*'([a-z]+)'/g)].map(m => m[1]!))]
}

describe('法宝效果 · 词汇表不虚设', () => {
  it('每一种声明过的效果,都至少有一件法宝在用', () => {
    const declared = effectTypesFromTypes()
    expect(declared.length, '一种效果都没扫到,断言形同虚设').toBeGreaterThanOrEqual(4)
    const used = new Set(ARTIFACTS.map(a => a.active.effect.type))
    const dead = declared.filter(t => !used.has(t as (typeof ARTIFACTS)[number]['active']['effect']['type']))
    expect(dead, `这些效果声明了却没有任何法宝用它 —— 写了不用等于没写:${dead.join('、')}`).toEqual([])
  })

  it('高界法宝里不止是数值放大:至少有一件用的是别的手艺', () => {
    // 「高界法宝」泛指 minTier ≥ 21 的那批(仙界/神界/混沌海)
    const high = ARTIFACTS.filter(a => a.minTier >= 21)
    expect(high.length, '高界法宝一件都没有,判据失去对象').toBeGreaterThan(4)
    // 基础四效 = 打/回/盾/削:高界若全在这四样里按倍率放大,那就是纯数值阶梯
    const BASIC = ['damage', 'heal', 'shield', 'weaken']
    const beyondBasic = high.filter(a => !BASIC.includes(a.active.effect.type))
    expect(
      beyondBasic.length,
      `高界 ${high.length} 件法宝全在「打/回/盾/削」四样里按倍率放大 —— 境界涨了,手艺没涨`
    ).toBeGreaterThan(0)
  })
})

describe('法宝效果 · 震慑真打断敌人那一手', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('仙琴每四回合摄神:敌人的出手被掐掉', () => {
    // 造一场「打不死彼此」的仗,好让回合数走到第 4 回合(法宝每 4 回合出手一次)
    const p = buildPlayerSnap()
    p.attack = gn(1)
    p.defense = gn(1e12)
    p.maxHp = gn(1e12)
    p.artifacts = [{ def: artifactDef('af_xianqin')!, level: 0 }]
    const enemy = makeEnemySnap(enemyDef('e_wolf')!, 1, 1)
    enemy.attack = gn(1)
    enemy.defense = gn(1e12)
    enemy.maxHp = gn(1e12)
    enemy.speed = 1
    let broken = 0
    let proc = 0
    for (let seed = 1; seed <= 20; seed += 1) {
      const result = resolveCombat(p, enemy, seeded(seed))
      const text = result.log.map(l => l.text).join('\n')
      if (text.includes('摄住')) proc += 1
      // 真正算数的是**敌人的那一手被跳过**那一条(只数法宝自己的台词等于没验)
      broken += result.log.filter(l => l.text.includes('被生生打断')).length
    }
    expect(proc, '20 场里一次震慑都没触发 —— 效果没接上').toBeGreaterThan(0)
    expect(broken, '震慑触发了却没打断任何一手 —— 只是文案').toBeGreaterThan(0)
  })
})

describe('法宝效果 · 破甲真让后续打得更疼', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('神鞭裂甲:同一场对局里,破甲之后回合数更少', () => {
    /**
     * 造一对「防御很厚、彼此都打不死」的对手,让破甲的效果能被量出来:
     * 同一个种子跑两遍 —— 带神鞭的那一遍从第 4 回合起敌人的防御降三成,
     * 于是同样的伤害掷点打出更高的有效伤害,结束得更早。
     */
    const withSunder = (): { rounds: number; text: string } => {
      const p = buildPlayerSnap()
      p.mods = {}
      p.attack = gn(1e6)
      p.defense = gn(1e12)
      p.maxHp = gn(1e12)
      p.artifacts = [{ def: artifactDef('af_shenbian')!, level: 0 }]
      const enemy = tankyWolf()
      const result = resolveCombat(p, enemy, seeded(11))
      return { rounds: result.rounds, text: result.log.map(l => l.text).join('\n') }
    }
    const without = (): number => {
      const p = buildPlayerSnap()
      p.mods = {}
      p.attack = gn(1e6)
      p.defense = gn(1e12)
      p.maxHp = gn(1e12)
      p.artifacts = []
      const enemy = tankyWolf()
      return resolveCombat(p, enemy, seeded(11)).rounds
    }
    const a = withSunder()
    const b = without()
    expect(a.text, '破甲的台词没出现 —— 效果没接上').toContain('护体被撕开')
    expect(a.rounds, `带破甲 ${a.rounds} 回合,不带 ${b} 回合 —— 破甲没有让敌人更好打`).toBeLessThan(b)
  })
})
