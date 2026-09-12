/* eslint-disable no-console -- 净念一例是"多少回合被救回来"的读数,打印出来便于复核 */
/**
 * 法宝效果的三个承诺 —— 词汇表不虚设,震慑真打断,净念真能挣脱
 *
 * 一、**声明即承诺**:ArtifactEffect 联合里写下的每种效果,都得有法宝在用。
 *     高界法宝此前一律是 damage/heal/shield/weaken 四种的数值放大(32 件里没有
 *     一件是别的手艺),于是「更高境界的法宝」只是打得更疼 —— 与「纯数值阶梯」
 *     是同一个毛病。本轮新增 { type: 'stun' },这条判据守着它别成为一纸空文。
 *
 * 二、**效果要真的发生**:震慑不是文案 —— 它在敌人该出手时把那一手掐掉。
 *     故这里真打一场(仙琴每 4 回合摄神),数敌人的「被打断回合」。
 *
 * 三、**防身型效果也要真的发生**:{ type: 'purge' } 是第一条「我扛得住你的阴招」。
 *     此前玩家对震慑毫无还手之力:十三种敌人会摄魂,中了白丢一回合,而战后分析
 *     只会说「N 个回合被震慑打断,节奏尽失」。故这里放一只必摄魂的敌人,
 *     同一批种子跑两遍(带/不带无相念珠),数玩家自己被跳过的回合数。
 *
 * 故障注入:把仙琴的 stun 换回 weaken、把 tryStun 的挣脱判定掏空,对应判据即红。
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

  /**
   * 文案里写的回合数,必须就是它真的出手的节拍。
   *
   * 法宝的主动说明是手写的(「每 4 回合青莲护身…」),而节拍写在 `active.interval` 里。
   * 两处各写各的,改一处忘另一处不会有任何报错 —— 玩家照着文案数回合,发现对不上,
   * 却没有任何地方能告诉他哪个是对的。故这里把「每 N 回合」与 interval 钉在一起。
   *
   * 唯一的例外是净念(无相念珠):它是随身被动,不走节拍(interval 记 1 表「常在」,
   * 见 types 里 ArtifactEffect.purge 的注释),文案也刻意不写回合数。
   */
  it('说明里写的回合数 = 它真的出手的节拍', () => {
    const CN: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    const bad: string[] = []
    let checkedCount = 0
    for (const a of ARTIFACTS) {
      if (a.active.effect.type === 'purge') continue
      const m = /每\s*([0-9一二三四五六七八九十]+)\s*回合/.exec(a.active.desc)
      if (!m) {
        bad.push(`${a.name}:说明里没有写回合数(「${a.active.desc}」)`)
        continue
      }
      const raw = m[1]!
      const n = /^\d+$/.test(raw) ? Number(raw) : CN[raw]
      checkedCount += 1
      if (n !== a.active.interval) bad.push(`${a.name}:说明写「每 ${raw} 回合」,节拍却是 ${a.active.interval}`)
    }
    expect(checkedCount, '一件法宝都没扫到,判据形同虚设').toBeGreaterThan(20)
    expect(bad, `这些法宝的说明与节拍对不上:\n${bad.join('\n')}`).toEqual([])
  })

  /**
   * 说明里的**数值**也必须等于数据里的数值。
   *
   * 与上一条同源:主动说明是手写的(「每 4 回合获得 32% 生命护盾」「造成 260% 攻击伤害」
   * 「其攻击降低 20%」),而真正的账在 effect 里(pctMaxHp / mult / pct)。
   * 手写的数字不会自己跟着数据走 —— 改数据忘改文案,玩家就会按错的数去配装。
   *
   * 例外:净念写的是「七成」(中文成数),单独换算。
   */
  it('说明里写的数值 = 数据里的数值', () => {
    const CN: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    const bad: string[] = []
    let checkedCount = 0
    for (const a of ARTIFACTS) {
      const eff = a.active.effect
      const desc = a.active.desc
      /** 说明里写的百分比(数值主体) */
      const pct = /([\d.]+)\s*%/.exec(desc)
      const cheng = /以([一二三四五六七八九十]+)成/.exec(desc)
      let claimed: number | null = null
      if (pct) claimed = Number(pct[1])
      else if (cheng) {
        const raw = cheng[1]!
        const n = /^\d+$/.test(raw) ? Number(raw) : CN[raw]
        // 「七成」= 70%
        if (n !== undefined) claimed = n * 10
      }
      /** 数据里写的百分比 */
      let actual: number | null = null
      if (eff.type === 'heal' || eff.type === 'shield') actual = eff.pctMaxHp * 100
      else if (eff.type === 'damage') actual = eff.mult * 100
      else if (eff.type === 'weaken' || eff.type === 'sunder') actual = eff.pct * 100
      else if (eff.type === 'purge') actual = eff.pct * 100
      if (actual === null) continue
      checkedCount += 1
      if (claimed === null) {
        bad.push(`${a.name}:说明里没写数值(「${desc}」),数据里却是 ${actual}%`)
        continue
      }
      // 浮点比较留一点余量(0.1 的倍数级别)
      if (Math.abs(claimed - actual) > 0.01) {
        bad.push(`${a.name}:说明写 ${claimed}%,数据是 ${actual}%`)
      }
    }
    expect(checkedCount, '一件法宝的数值都没扫到,判据形同虚设').toBeGreaterThan(25)
    expect(bad, `这些法宝的说明与数据对不上:\n${bad.join('\n')}`).toEqual([])
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

/**
 * 一只「必定摄魂、但打不死人」的靶子:e_hog 的技能率拉到 100% 且带 stun,
 * 于是玩家每回合都有约一半的机会被震慑(引擎里 stun 还要再过 50% 那一掷)。
 * 攻击与气血都调成打不死彼此 —— 量的是「被跳过多少个回合」,不是谁赢。
 */
function stunningFoe(): ReturnType<typeof makeEnemySnap> {
  const snap = makeEnemySnap(enemyDef('e_wolf')!, 1, 1)
  snap.name = '摄魂靶子'
  snap.skills = [{ name: '摄魂', mult: 1, rate: 1, effect: 'stun' }]
  snap.attack = gn(1)
  snap.defense = gn(1e12)
  snap.maxHp = gn(1e12)
  snap.speed = 1
  snap.mods = {}
  return snap
}

/** 打一场「打不死彼此」的对局,返回玩家被震慑跳过的回合数 */
function stunnedTurnsAgainst(withPurge: boolean, seed: number): number {
  const p = buildPlayerSnap()
  p.mods = {}
  p.attack = gn(1)
  p.defense = gn(1e12)
  p.maxHp = gn(1e12)
  p.artifacts = withPurge ? [{ def: artifactDef('af_wuxiangzhu')!, level: 0 }] : []
  return resolveCombat(p, stunningFoe(), seeded(seed)).stats!.player.stunnedTurns
}

describe('法宝效果 · 净念真能挣脱震慑', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('同一批种子:带无相念珠,被震慑跳过的回合明显更少', () => {
    let bare = 0
    let withPurge = 0
    for (let seed = 1; seed <= 30; seed += 1) {
      bare += stunnedTurnsAgainst(false, seed)
      withPurge += stunnedTurnsAgainst(true, seed)
    }
    expect(bare, '靶子根本没摄住人,这条判据失去对象').toBeGreaterThan(0)
    expect(
      withPurge,
      `30 场累计被跳过 ${withPurge} 回合,不带念珠是 ${bare} 回合 —— 净念没有让任何一手打出来`
    ).toBeLessThan(bare)
    console.log(`\n必摄魂靶子 × 30 场:不带念珠被跳过 ${bare} 回合,带念珠 ${withPurge} 回合`)
  })

  it('挣脱是真的发生:日志里留下「散于无形」,且不占出手节拍', () => {
    const withPearls = (foe: ReturnType<typeof makeEnemySnap>, seed: number): ReturnType<typeof resolveCombat> => {
      const p = buildPlayerSnap()
      p.mods = {}
      p.attack = gn(1)
      p.defense = gn(1e12)
      p.maxHp = gn(1e12)
      p.artifacts = [{ def: artifactDef('af_wuxiangzhu')!, level: 0 }]
      return resolveCombat(p, foe, seeded(seed))
    }
    const fight = withPearls(stunningFoe(), 7)
    const text = fight.log.map(l => l.text).join('\n')
    expect(text, '念珠一次的台词都没出现 —— 挣脱没接上').toContain('摄魂之力散于无形')
    // 它是随身被动:对手不摄魂时,它一次都不该"出手"
    // (若有人把 combat 里那句 purge 跳过删掉,它就会每回合掉进 weaken 分支刷满触发)
    const noStun = withPearls(tankyWolf(), 7)
    expect(
      noStun.stats!.player.artifactProcs,
      `对手不摄魂,念珠却"触发"了 ${noStun.stats!.player.artifactProcs} 次 —— 随身被动被当成每回合出手了`
    ).toBe(0)
  })
})
