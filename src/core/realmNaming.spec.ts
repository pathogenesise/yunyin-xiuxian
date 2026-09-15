/**
 * 名与境界同形 —— 名字得跟着境界走,还得跟得上内容
 *
 * 扩界之后最容易出事的地方不是数值,是**名目**:一件 26 阶掉出来的「玄铁重甲」
 * 谁都不会信它是神界之物,而玩家分辨一件东西属于哪一界,靠的正是名字。
 * 故这里把「高界的东西名字里得带本界的印记」钉成判据 —— 词由本界域的地界与境界
 * 长出来(仙界:云海仙门/金阙玉京/瑶池/星陨仙台 → 仙云玉瑶星虚;神界:神域/神帝/
 * 帝阙/神诏 → 神帝王冕诏法则;混沌海:混沌之滨/鸿蒙本源/道祖悟道崖 → 混沌鸿蒙本源
 * 真灵无极开天道)。
 *
 * 另外两条守着**规模**与**可达**:
 *   · 一件东西的层级门槛必须落在真实存在的区域层级上 —— 否则它归属哪一界都说不清;
 *   · 每一件模板都真的进得了掉落池 —— 从前的「取最高 6 件」硬截断让仙界/神界/混沌海
 *     各有三件(项链/戒指/灵符)永远掉不出来,图鉴里那九格谁也不点不亮(已修)。
 */
import { describe, expect, it } from 'vitest'
import { EQUIPMENT_TEMPLATES, EQUIP_SLOT_NAMES } from '@/data/equipment'
import { ARTIFACTS } from '@/data/artifacts'
import { GONGFA } from '@/data/gongfa'
import { REGIONS } from '@/data/regions'
import { WORLDS, worldOf } from '@/data/realms'
import type { EquipSlot, WorldId } from '@/types'
import { equipTemplatePool } from './equipGen'

/** 层级 → 界域:与内容密度审计同一份口径(区域表是层级的唯一来源) */
const TIER_WORLD = new Map<number, WorldId>()
for (const r of REGIONS) TIER_WORLD.set(r.tier, worldOf(r.minRealm).id)
const ALL_TIERS = [...TIER_WORLD.keys()]
const MAX_TIER = Math.max(...ALL_TIERS)

/** 各高界的印记字 —— 从该界域的地界名与境界名里取,不是另编一套词 */
const MARKS: Record<Exclude<WorldId, 'mortal'>, string[]> = {
  // 雷:太乙雷池是仙界的地界,那一界的名目绕不开它
  immortal: ['仙', '云', '玉', '瑶', '星', '虚', '太', '罗', '雷'],
  god: ['神', '帝', '王', '冕', '诏', '法', '则'],
  chaos: ['混', '沌', '鸿', '蒙', '本', '源', '真', '灵', '无', '极', '开', '道', '界', '神', '魔']
}

function hasMark(name: string, world: Exclude<WorldId, 'mortal'>): boolean {
  const marks = MARKS[world]
  return [...name].some(c => marks.includes(c))
}

describe('名与境界同形 · 高界内容的名字带本界印记', () => {
  const equipmentByWorld = (w: WorldId): typeof EQUIPMENT_TEMPLATES =>
    EQUIPMENT_TEMPLATES.filter(t => TIER_WORLD.get(t.tier) === w)

  it('每件高界装备的名字里都看得出是哪一界的东西', () => {
    const bad: string[] = []
    for (const w of ['immortal', 'god', 'chaos'] as const) {
      const rows = equipmentByWorld(w)
      expect(rows.length, `${w} 界没有专属装备模板,判据失去对象`).toBeGreaterThan(0)
      for (const t of rows) {
        if (!hasMark(t.name, w)) bad.push(`${WORLDS.find(x => x.id === w)!.name} ${t.name}(${t.tier} 阶)`)
      }
    }
    expect(bad, `这些高界装备的名字里没有本界印记:\n${bad.join('\n')}`).toEqual([])
  })

  it('每件高界法宝的名字里都看得出是哪一界的东西', () => {
    const bad: string[] = []
    for (const w of ['immortal', 'god', 'chaos'] as const) {
      const rows = ARTIFACTS.filter(a => TIER_WORLD.get(a.fromTier) === w)
      expect(rows.length).toBeGreaterThan(0)
      for (const a of rows) {
        if (!hasMark(a.name, w)) bad.push(`${WORLDS.find(x => x.id === w)!.name} ${a.name}(${a.fromTier} 阶)`)
      }
    }
    expect(bad, `这些高界法宝的名字里没有本界印记:\n${bad.join('\n')}`).toEqual([])
  })

  it('每部高界功法的名字里都看得出是哪一界的东西', () => {
    const bad: string[] = []
    for (const def of GONGFA) {
      const w = worldOf(def.minRealm).id
      if (w === 'mortal') continue
      if (!hasMark(def.name, w)) bad.push(`${WORLDS.find(x => x.id === w)!.name} ${def.name}(境 ${def.minRealm})`)
    }
    expect(bad, `这些高界功法的名字里没有本界印记:\n${bad.join('\n')}`).toEqual([])
  })
})

describe('名与境界同形 · 一件东西只有一个名字', () => {
  function dupes(names: string[]): string[] {
    const seen = new Map<string, number>()
    for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1)
    return [...seen.entries()].filter(([, n]) => n > 1).map(([n]) => n)
  }

  it('同一张表里不重名', () => {
    expect(dupes(EQUIPMENT_TEMPLATES.map(t => t.name)), '装备模板重名').toEqual([])
    expect(dupes(ARTIFACTS.map(a => a.name)), '法宝重名').toEqual([])
    expect(dupes(GONGFA.map(g => g.name)), '功法重名').toEqual([])
  })

  it('装备 / 法宝 / 功法之间也不撞名 —— 图鉴里它们是同一套称呼', () => {
    const combined = [
      ...EQUIPMENT_TEMPLATES.map(t => t.name),
      ...ARTIFACTS.map(a => a.name),
      ...GONGFA.map(g => g.name)
    ]
    expect(dupes(combined), '跨表重名会让玩家以为是同一件东西').toEqual([])
  })

  it('id 也唯一 —— 回查与存档都靠它', () => {
    expect(dupes(EQUIPMENT_TEMPLATES.map(t => t.id))).toEqual([])
    expect(dupes(ARTIFACTS.map(a => a.id))).toEqual([])
    expect(dupes(GONGFA.map(g => g.id))).toEqual([])
  })
})

describe('名与境界同形 · 写了就得掉得出来', () => {
  it('装备的 tier 与法宝的 fromTier 都落在真实存在的区域层级上', () => {
    const tiers = new Set(ALL_TIERS)
    for (const t of EQUIPMENT_TEMPLATES) {
      expect(tiers.has(t.tier), `装备「${t.name}」的 tier=${t.tier} 不是一个真实区域层级`).toBe(true)
    }
    for (const a of ARTIFACTS) {
      expect(tiers.has(a.fromTier), `法宝「${a.name}」的 fromTier=${a.fromTier} 不是一个真实区域层级`).toBe(true)
    }
  })

  it('每一件装备模板都真的进得了池 —— 池子外的名字是图鉴里点不亮的灯', () => {
    const dead = EQUIPMENT_TEMPLATES.filter(
      t => !ALL_TIERS.some(tier => equipTemplatePool(tier).some(x => x.id === t.id))
    )
    expect(dead.map(t => `${t.name}(${t.id})`), '这些模板在任何层级都进不了掉落池').toEqual([])
  })

  /**
   * 一阶一名 —— 名字负责区分,数字只是让人看得更快的辅助。
   *
   * 从前掉落池是累积的:13 阶的地界照样掉得出 8 阶的星辰冠,于是同一个名字顶着
   * 不同的数字出现,玩家分不清是「同一件的不同成色」还是「两件不同的东西」。
   * 现在一件只属一阶,这两条判据守着它:每阶九件齐备、掉落池按阶取。
   */
  it('每一阶、每一个部位都有本阶的名目 —— 缺一格,那一格就只能掉出别阶的东西', () => {
    const SLOTS: EquipSlot[] = ['weapon', 'head', 'body', 'wrist', 'belt', 'boots', 'necklace', 'ring', 'talisman']
    const thin: string[] = []
    for (const tier of ALL_TIERS) {
      const have = new Set(EQUIPMENT_TEMPLATES.filter(t => t.tier === tier).map(t => t.slot))
      for (const s of SLOTS) if (!have.has(s)) thin.push(`${tier} 阶 · ${EQUIP_SLOT_NAMES[s]}`)
    }
    expect(thin, `这些层级/部位没有本阶名目:\n${thin.join('\n')}`).toEqual([])
  })

  it('掉落池按阶取:某阶掉出的名字,必属该阶(名字与阶一一对应)', () => {
    const wrong: string[] = []
    for (const tier of ALL_TIERS) {
      for (const t of equipTemplatePool(tier)) {
        if (t.tier !== tier) wrong.push(`${tier} 阶的池子里有 ${t.name}(${t.tier} 阶)`)
      }
      const pool = equipTemplatePool(tier)
      expect(pool.length, `${tier} 阶的池子是空的`).toBeGreaterThan(0)
      // 九槽各一件:掉什么部位不再由表的行序决定
      expect(new Set(pool.map(t => t.slot)).size, `${tier} 阶的池子没覆盖九个部位`).toBe(9)
    }
    expect(wrong, `这些名字跨阶掉出来了:\n${wrong.join('\n')}`).toEqual([])
  })

  it('装备模板的最高层级不超过最高区域层级(否则那件永不掉落)', () => {
    const top = Math.max(...EQUIPMENT_TEMPLATES.map(t => t.tier))
    const topArtifact = Math.max(...ARTIFACTS.map(a => a.fromTier))
    expect(top).toBeLessThanOrEqual(MAX_TIER)
    expect(topArtifact).toBeLessThanOrEqual(MAX_TIER)
  })
})
