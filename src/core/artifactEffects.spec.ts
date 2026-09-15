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
import {
  ARTIFACTS,
  ARTIFACT_DRAIN_HEAL_CAP,
  ARTIFACT_LEVEL_BONUS,
  ARTIFACT_PURGE_CAP,
  ARTIFACT_SUNDER_CAP,
  ARTIFACT_WEAKEN_CAP,
  artifactActiveText,
  artifactDef,
  artifactLevelLabel,
  artifactNextLevelGain,
  artifactPassiveAt
} from '@/data/artifacts'
import { RandomService, mulberry32 } from '@/utils/random'
import { gn, toNum } from '@/utils/gnum'
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
    // 「高界法宝」泛指 fromTier ≥ 21 的那批(仙界/神界/混沌海)
    const high = ARTIFACTS.filter(a => a.fromTier >= 21)
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
      else if (eff.type === 'damage' || eff.type === 'drain') actual = eff.mult * 100
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
      // 吸命还有第二个数:回复占比(`healPct`)也要与「回复其中 N%」对得上
      if (eff.type === 'drain') {
        const back = /回复其中\s*([\d.]+)\s*%/.exec(desc)
        checkedCount += 1
        if (!back) {
          bad.push(`${a.name}:吸命却没说回复几成(「${desc}」)`)
        } else if (Math.abs(Number(back[1]) - eff.healPct * 100) > 0.01) {
          bad.push(`${a.name}:说明写回复其中 ${back[1]}%,数据是 ${eff.healPct * 100}%`)
        }
      }
    }
    expect(checkedCount, '一件法宝的数值都没扫到,判据形同虚设').toBeGreaterThan(25)
    expect(bad, `这些法宝的说明与数据对不上:\n${bad.join('\n')}`).toEqual([])
  })
})

/**
 * 祭炼之后,说明得跟着说实话。
 *
 * 上一条对账只比「0 级文案」与「0 级数值」—— 而玩家会把法宝炼到九重(×1.72)。
 * 战斗一直按倍率算,卡片上印的却永远是 0 级那句:实测玄虚拂尘写着「造成 230% 攻击伤害」,
 * 真打出去是 395.6%;神鞭写着「防御降低 30%」,实际早已顶到 50% 的上限。
 * 故说明改成由 artifactEffectValues 现算(战斗与文案读同一个函数),这里守住三件事:
 * 措辞不动、数值随等级、封顶到了要写封顶值。
 */
describe('法宝说明 · 数字随祭炼等级走', () => {
  /** 期望值独立复算:从原始 effect 字段 + 增幅 + 封顶推出来,不复用被测函数 */
  function expected(def: (typeof ARTIFACTS)[number], level: number): { main: number | null; heal?: number } {
    const eff = def.active.effect
    const mult = 1 + level * ARTIFACT_LEVEL_BONUS
    switch (eff.type) {
      case 'damage':
        return { main: eff.mult * mult }
      case 'drain':
        return { main: eff.mult * mult, heal: Math.min(ARTIFACT_DRAIN_HEAL_CAP, eff.healPct * mult) }
      case 'heal':
      case 'shield':
        return { main: eff.pctMaxHp * mult }
      case 'weaken':
        return { main: Math.min(ARTIFACT_WEAKEN_CAP, eff.pct * mult) }
      case 'sunder':
        return { main: Math.min(ARTIFACT_SUNDER_CAP, eff.pct * mult) }
      case 'purge':
        return { main: Math.min(ARTIFACT_PURGE_CAP, eff.pct * mult) }
      case 'stun':
        return { main: null }
    }
  }

  const pcts = (text: string): number[] => [...text.matchAll(/([\d.]+)\s*%/g)].map(m => Number(m[1]))
  /** 中文成数换算(净念写的是「七成」,不比百分号) */
  const CHENG = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  const chengOf = (text: string): number | null => {
    const m = /([一二三四五六七八九十])成/.exec(text)
    return m ? CHENG.indexOf(m[1]!) + 1 : null
  }

  it('0 级时与原说明逐字相同 —— 只换数字,不碰措辞', () => {
    for (const a of ARTIFACTS) {
      expect(artifactActiveText(a, 0), `${a.name} 的 0 级说明被改写过了`).toBe(a.active.desc)
    }
  })

  it('0 / 3 / 9 级:说明里的数就是这一级真正生效的数(含封顶)', () => {
    for (const level of [0, 3, 9]) {
      for (const a of ARTIFACTS) {
        const want = expected(a, level)
        const text = artifactActiveText(a, level)
        if (want.main === null) {
          expect(pcts(text), `${a.name} 没有数值却出现了百分数`).toEqual([])
          continue
        }
        if (a.active.effect.type === 'purge') {
          const cheng = chengOf(text)
          expect(cheng, `${a.name} 该以成数写明挣脱概率:「${text}」`).not.toBeNull()
          expect(
            Math.abs(cheng! - want.main * 10),
            `${a.name} 第 ${level} 级写「${cheng}成」,实际 ${(want.main * 100).toFixed(1)}%`
          ).toBeLessThan(0.51)
          continue
        }
        const got = pcts(text)
        // 小数位由 formatPercent 决定,故比对到一位小数
        expect(got.length, `${a.name} 的说明少了数值:「${text}」`).toBeGreaterThan(0)
        expect(Math.abs(got[0]! - want.main * 100), `${a.name} 第 ${level} 级说明写 ${got[0]}%,实际 ${want.main * 100}%`).toBeLessThan(0.11)
        if (want.heal !== undefined) {
          expect(got.length, `${a.name} 的吸命该有两个百分数:「${text}」`).toBe(2)
          expect(Math.abs(got[1]! - want.heal * 100), `${a.name} 的回补比例对不上:${text}`).toBeLessThan(0.11)
        }
      }
    }
  })

  it('顶到封顶就写封顶值 —— 破甲 30% 炼到九重是 50%,净念七成变九成', () => {
    const shenbian = artifactDef('af_shenbian')!
    expect(artifactActiveText(shenbian, 0)).toContain('30%')
    expect(artifactActiveText(shenbian, 9), '破甲上限 50%,说明不能再报 51.6%').toContain('50%')
    const nianzhu = artifactDef('af_wuxiangzhu')!
    expect(artifactActiveText(nianzhu, 0)).toContain('七成')
    expect(artifactActiveText(nianzhu, 9), '净念上限九成').toContain('九成')
  })

  it('越界等级钳回 0..9,不会算出界面撑不住的数', () => {
    const a = ARTIFACTS[0]!
    expect(artifactActiveText(a, -3)).toBe(a.active.desc)
    expect(artifactActiveText(a, 99)).toBe(artifactActiveText(a, 9))
  })

  it('祭炼等级不叫「阶」——「阶」是地界与装备层级的词', () => {
    const label = artifactLevelLabel(3)
    expect(label).toContain('祭炼')
    expect(label, `法宝等级不该借用「阶」:${label}`).not.toContain('阶')
    expect(label).toContain('3')
  })
})

/**
 * 祭炼下一重的账 —— 「值不值」要在按下之前答得出来。
 *
 * 炼化按钮原先只报代价(悟道点 × 灵石),收益留给玩家自己按 ×1.08 心算。
 * 这里把下一重逐项算好(被动、神通主体、吸命回补),顶上封顶的标出来 ——
 * 判据是**逐项对得上独立复算**,且不会出现「越炼越弱」或「到顶还劝你炼」。
 */
describe('法宝说明 · 下一重给多少', () => {
  const sutra = artifactDef('af_shenbian')! // 破甲 30%,有 50% 上限
  const nianzhu = artifactDef('af_wuxiangzhu')! // 净念 70%,有 90% 上限
  const qin = artifactDef('af_xianqin')! // 震慑:没有数值
  const fuchen = artifactDef('af_xuanxu')! // 吸命:伤害 + 回补,回补有 100% 上限

  it('已至满重就没有「下一重」这一说', () => {
    expect(artifactNextLevelGain(qin, 9)).toBeNull()
    expect(artifactNextLevelGain(qin, 99)).toBeNull()
    expect(artifactNextLevelGain(qin, 8)?.level).toBe(9)
  })

  it('被动逐项与 artifactPassiveAt 的下一重值一致', () => {
    for (const level of [0, 4, 8]) {
      const gain = artifactNextLevelGain(sutra, level)!
      const now = artifactPassiveAt(sutra, level)
      const next = artifactPassiveAt(sutra, level + 1)
      expect(gain.passive.length).toBe(Object.keys(sutra.passive).length)
      for (const p of gain.passive) {
        expect(p.from).toBeCloseTo(now[p.key] ?? 0, 10)
        expect(p.to).toBeCloseTo(next[p.key] ?? 0, 10)
        expect(p.to, '祭炼不该让被动变小').toBeGreaterThanOrEqual(p.from)
      }
    }
  })

  it('神通主体按封顶报数:神鞭重 8 → 50%(已至上限),净念重 8 → 九成', () => {
    const s8 = artifactNextLevelGain(sutra, 8)!
    expect(s8.active!.to).toBeCloseTo(ARTIFACT_SUNDER_CAP, 10)
    expect(s8.active!.capped, '已经顶到 50% 了,得说清楚再炼也不会更多').toBe(true)
    const s7 = artifactNextLevelGain(sutra, 7)!
    expect(s7.active!.capped).toBe(false)
    const n8 = artifactNextLevelGain(nianzhu, 8)!
    expect(n8.active!.to).toBeCloseTo(ARTIFACT_PURGE_CAP, 10)
    expect(n8.active!.capped).toBe(true)
  })

  it('震慑这类没有数值的神通,如实说「不随祭炼变」', () => {
    const gain = artifactNextLevelGain(qin, 3)!
    expect(gain.active).toBeNull()
    // 但它仍有被动可涨 —— 否则这件法宝炼了等于没炼,那是另一个 bug
    expect(gain.passive.length).toBeGreaterThan(0)
  })

  it('吸命的两笔账都在:伤害继续涨,回补到顶后标出来', () => {
    const low = artifactNextLevelGain(fuchen, 0)!
    expect(low.active!.to).toBeGreaterThan(low.active!.from)
    expect(low.heal).toBeDefined()
    expect(low.heal!.capped).toBe(false)
    const high = artifactNextLevelGain(fuchen, 8)!
    expect(high.heal!.to).toBeCloseTo(ARTIFACT_DRAIN_HEAL_CAP, 10)
    expect(high.heal!.capped, '回补已经吃到十成,再炼也只是伤害在涨').toBe(true)
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

/**
 * 吸命(drain)—— 高界法宝的第五种手艺:**打的与回的,是同一件事**。
 *
 * 此前高界法宝的续航全是「回复 N% 生命」(与输出各占一件),故一个法宝位永远要在
 * 「打得更疼」与「活得久一点」之间二选一。吸命让一份伤害同时办两件事,
 * 于是「带哪一件」这个问题在高界多出一种答案。
 *
 * 这里量的是真发生:同一批种子、同一只靶子,带拂尘的那一场回的血更多,
 * 且日志里留得下「吸取敌手精血」那一条。故障注入:把 combat 里 drain 那条分支
 * 删掉,它就掉进 else 的 weaken 分支 —— 回血不见了,判据立刻红。
 */
describe('法宝效果 · 吸命真把伤害补回自己身上', () => {
  beforeEach(() => setActivePinia(createPinia()))

  /** 一只打得疼你但打不死你的靶子:好让"回血"这件事有量可量 */
  function bleedingFoe(): ReturnType<typeof makeEnemySnap> {
    const foe = tankyWolf()
    foe.attack = gn(3e5)
    return foe
  }

  function fight(withDrain: boolean, seed: number): ReturnType<typeof resolveCombat> {
    const p = buildPlayerSnap()
    p.mods = {}
    p.attack = gn(1e6)
    p.defense = gn(1e6)
    p.maxHp = gn(1e9)
    p.artifacts = withDrain ? [{ def: artifactDef('af_xuanxu')!, level: 0 }] : []
    return resolveCombat(p, bleedingFoe(), seeded(seed))
  }

  it('带玄虚拂尘的那一场,自己回的血更多,日志里留得下「吸取敌手精血」', () => {
    let withDrain = 0
    let bare = 0
    let sawLine = 0
    for (let seed = 1; seed <= 12; seed += 1) {
      const a = fight(true, seed)
      const b = fight(false, seed)
      if (a.log.map(l => l.text).join('\n').includes('吸取敌手精血')) sawLine += 1
      withDrain += toNum(a.stats!.player.healed)
      bare += toNum(b.stats!.player.healed)
    }
    expect(sawLine, '12 场里一次吸命都没触发 —— 效果没接上').toBeGreaterThan(0)
    expect(
      withDrain,
      `12 场累计回血:带拂尘 ${withDrain.toExponential(2)},不带 ${bare.toExponential(2)} —— 吸命没有把伤害补回来`
    ).toBeGreaterThan(bare)
  })
})
