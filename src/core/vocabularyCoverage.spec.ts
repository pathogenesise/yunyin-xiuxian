/**
 * 声明即承诺 —— 类型里写下的每种「词汇」,引擎必须接得住
 *
 * 这一轮清扫出的真事故有个共同形状:**声明在前,实现没跟**。
 * 最刺眼的是奇遇连锁:CHAIN_EVENT_IDS 列了五个事件 id、转世继承清单也写了它,
 * 而事件库里根本没有那五个事件 —— 类型与数据说着"有",引擎说着"没有"。
 *
 * 故这里把三处"词汇表"钉成红线,判据是源码级的:
 *
 *   一 事件效果的每种 type:eventEngine 必须真的处理,否则静默走兜底文案
 *     (玩家看到"灵草 +10",数据里没有任何红);
 *   二 选项条件的每种 type:choiceAvailable 必须真的校验,否则条件形同虚设;
 *   三 计数器的每个键:必须有写入方(track),否则引用它的成就永远拿不到;
 *   四 属性键的每个键:必须有读取方,否则给它的词条/天赋全是死加成。
 *
 * 故障注入:删掉任一 case、任一 track 写入、任一属性读取点,本文件立刻变红。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AFFIXES } from '@/data/affixes'
import { ARTIFACTS } from '@/data/artifacts'
import { BUFFS } from '@/data/buffs'
import { GONGFA_BRANCHES } from '@/data/gongfaBranches'
import { TALENTS } from '@/data/talents'
import { TITLES } from '@/data/titles'

const SRC = resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const TYPES_SRC = readFileSync(join(SRC, 'types/index.ts'), 'utf8')

/** 取一段类型声明里的联合成员(字符串字面量) */
function unionMembers(startMarker: string, endMarker: string): string[] {
  const from = TYPES_SRC.indexOf(startMarker)
  expect(from, `types/index.ts 里找不到 ${startMarker}`).toBeGreaterThanOrEqual(0)
  const to = TYPES_SRC.indexOf(endMarker, from)
  const block = TYPES_SRC.slice(from, to > 0 ? to : undefined)
  return [...new Set([...block.matchAll(/'([A-Za-z]+)'/g)].map(m => m[1]!))]
}

/**
 * 取判别联合里的 type 值(如 EventEffect/EventCond)。
 *
 * 不能只抓字符串字面量 —— 成员内部还有嵌套联合(如 material 的 id: 'herb' | 'ore'),
 * 那些是取值域不是判别值,抓进来会误报。
 */
function taggedTypes(startMarker: string): string[] {
  const from = TYPES_SRC.indexOf(startMarker)
  expect(from, `types/index.ts 里找不到 ${startMarker}`).toBeGreaterThanOrEqual(0)
  // 结束点取「声明体之后的第一个顶层 export」——EventCond 与 EventEffect 相邻,
  // 若只按给定结束标记切,会把下一段声明的判别值一起抓进来(红线就会名不副实)
  const rest = TYPES_SRC.slice(from)
  const nextExport = rest.slice(1).search(/\nexport /)
  const block = nextExport > 0 ? rest.slice(0, nextExport + 1) : rest
  return [...new Set([...block.matchAll(/type:\s*'([A-Za-z]+)'/g)].map(m => m[1]!))]
}

/** 除数据与类型之外的全部源码(实现层) */
const implFiles = walk(SRC).filter(f => !f.includes('/data/') && !f.endsWith('types/index.ts') && !f.endsWith('.spec.ts'))
const implCorpus = implFiles.map(f => readFileSync(f, 'utf8')).join('\n')
const engineSrc = readFileSync(join(SRC, 'core/eventEngine.ts'), 'utf8')

describe('声明即承诺 · 事件词汇', () => {
  const effectTypes = taggedTypes('export type EventEffect =')
  const condTypes = taggedTypes('export type EventCond =')

  it('每种事件效果都有引擎实现(不靠兜底文案蒙混)', () => {
    expect(effectTypes.length).toBeGreaterThanOrEqual(8)
    for (const t of effectTypes) {
      expect(engineSrc, `事件效果 ${t} 没有 case`).toContain(`case '${t}'`)
    }
  })

  it('每种选项条件都有校验(不靠默认放行蒙混)', () => {
    expect(condTypes.length).toBeGreaterThanOrEqual(3)
    for (const t of condTypes) {
      expect(engineSrc, `选项条件 ${t} 没有 case`).toContain(`case '${t}'`)
    }
  })
})

describe('声明即承诺 · 计数与属性', () => {
  const counters = unionMembers('export type CounterKey =', 'export type AchvCond')
  const statKeys = unionMembers('export type PercentStatKey =', 'export type AnyStatKey')

  it('每个计数器都有写入方 —— 否则引用它的成就永远拿不到', () => {
    expect(counters.length).toBeGreaterThanOrEqual(10)
    const unbacked = counters.filter(k => !implCorpus.includes(`track('${k}'`))
    expect(unbacked, `这些计数器没有任何 track 写入点`).toEqual([])
  })

  it('每个属性键都有读取方 —— 否则给它的词条与天赋全是死加成', () => {
    expect(statKeys.length).toBeGreaterThanOrEqual(30)
    const unread = statKeys.filter(k => {
      const asLiteral = implCorpus.includes(`'${k}'`) || implCorpus.includes(`"${k}"`)
      const asField = new RegExp(`\\.${k}\\b`).test(implCorpus)
      return !asLiteral && !asField
    })
    expect(unread, `这些属性键无人读取(接上它,或从类型里删掉)`).toEqual([])
  })

  /**
   * 反过来的那一半:**读得到,也得拿得到**。
   *
   * 上一条只保证「给了它有用」,不保证「拿得到它」。命中(accuracy)就是这么补的:
   * 闪避型首领的幻境此前无解 —— 玩家没有命中这个属性,面对五成闪避只能靠运气,
   * 战后分析照样会说「N 次出手落空,连击与暴击难以衔接」。若只加一个类型、
   * 不加任何来源,玩家既看不见也拿不到,等于没加。
   *
   * 来源池 = 所有会发 StatMods 的数据表(词条 / 功法分支 / 法宝被动 / 天赋 / 称号 / buff)。
   * 故障注入:把 accuracy 的三处来源(ac1~ac3 词条、庚金剑典·破妄、周天星盘被动)删掉,这里立刻红。
   */
  it('每个属性键都拿得到 —— 否则它只是一句谁也碰不到的类型声明', () => {
    const sources = new Map<string, Set<string>>()
    const note = (key: string, where: string): void => {
      const set = sources.get(key) ?? new Set<string>()
      set.add(where)
      sources.set(key, set)
    }
    for (const a of AFFIXES) note(a.key, '装备词条')
    for (const b of GONGFA_BRANCHES) for (const k of Object.keys(b.mods)) note(k, '功法分支')
    for (const a of ARTIFACTS) for (const k of Object.keys(a.passive)) note(k, '法宝被动')
    for (const t of TALENTS) for (const k of Object.keys(t.mods)) note(k, '天赋')
    for (const t of TITLES) for (const k of Object.keys(t.mods)) note(k, '称号')
    for (const b of BUFFS) for (const k of Object.keys(b.mods)) note(k, '临时状态')

    const orphan = statKeys.filter(k => !sources.has(k))
    expect(
      orphan,
      `这些属性键没有任何来源 —— 玩家一辈子拿不到它:${orphan.join('、')}`
    ).toEqual([])
  })
})
