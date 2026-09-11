/**
 * 境界体系结构审计(扩界核心)
 *
 * 扩界把 10 境改成 4 界域 21 境,整套内容 gate / 存档 / 审计都建立在下标之上。
 * 这里守住四条承重结构:
 *   1. 界域是 0..MAX 的一个真划分(无缝、无重叠、有序),每个境界恰属一界
 *   2. 0-9 号境界「冻结」:id/名称不得改动 —— 存档、内容 minRealm、审计口径全押在旧下标上
 *   3. 具名常量不自相矛盾:WORLD_BREAK_MAJOR = 仙界起点 = 真仙;REBIRTH_REFERENCE_MAJOR 同指
 *   4. 回查函数越界即钳制,不返回 undefined
 */
import { describe, expect, it } from 'vitest'
import {
  REALMS,
  WORLDS,
  MAX_MAJOR,
  WORLD_BREAK_MAJOR,
  REBIRTH_REFERENCE_MAJOR,
  realmDef,
  realmLabel,
  worldOf,
  worldDef,
  isWorldEntry
} from '@/data/realms'

/** 扩界时对 0-9 号境界的承诺:id 与名称一字不动(存档/内容 gate 兼容) */
const FROZEN_IDS = ['lianqi', 'zhuji', 'jindan', 'yuanying', 'huashen', 'lianxu', 'heti', 'dacheng', 'dujie', 'zhenxian']
const FROZEN_NAMES = ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙']

describe('境界体系 · 结构', () => {
  it('REALMS 与 MAX_MAJOR 自洽,每境字段齐全', () => {
    expect(REALMS.length).toBe(MAX_MAJOR + 1)
    for (const [i, r] of REALMS.entries()) {
      expect(r.id, `第 ${i} 境缺 id`).toBeTruthy()
      expect(r.name, `第 ${i} 境缺 name`).toBeTruthy()
      expect(r.desc).toBeTruthy()
      expect(r.lifespanYears, `${r.name} 寿元非正`).toBeGreaterThan(0)
    }
    expect(new Set(REALMS.map(r => r.id)).size, '境界 id 重复').toBe(REALMS.length)
    expect(new Set(REALMS.map(r => r.name)).size, '境界名重复').toBe(REALMS.length)
  })

  it('0-9 号境界冻结:id/名称与扩界前一字不差', () => {
    for (let i = 0; i < FROZEN_IDS.length; i += 1) {
      expect(REALMS[i]!.id, `第 ${i} 境 id 被改动`).toBe(FROZEN_IDS[i])
      expect(REALMS[i]!.name, `第 ${i} 境名称被改动`).toBe(FROZEN_NAMES[i])
    }
  })

  it('界域是 0..MAX 的真划分:有序、无缝、无重叠', () => {
    expect(WORLDS.length).toBeGreaterThanOrEqual(4)
    expect(WORLDS[0]!.start).toBe(0)
    expect(WORLDS[WORLDS.length - 1]!.end).toBe(MAX_MAJOR)
    for (let i = 0; i < WORLDS.length; i += 1) {
      const w = WORLDS[i]!
      expect(w.start, `${w.name} 起点越界`).toBeLessThanOrEqual(w.end)
      expect(w.name).toBeTruthy()
      expect(w.desc).toBeTruthy()
      if (i > 0) {
        // 严丝合缝:上一界的 end + 1 === 本界 start
        expect(w.start, `${WORLDS[i - 1]!.name} 与 ${w.name} 之间有空隙/重叠`).toBe(WORLDS[i - 1]!.end + 1)
      }
      // 界内每个大境界都归属本界
      for (let m = w.start; m <= w.end; m += 1) {
        expect(worldOf(m).id, `第 ${m} 境归属错误`).toBe(w.id)
        expect(isWorldEntry(m), `第 ${m} 境入口判定错误`).toBe(m === w.start)
      }
    }
  })

  it('具名常量不自相矛盾:仙界门槛 = 真仙,且为轮回参照终点', () => {
    expect(worldOf(WORLD_BREAK_MAJOR).id).toBe('immortal')
    expect(worldDef('immortal').start).toBe(WORLD_BREAK_MAJOR)
    expect(REALMS[WORLD_BREAK_MAJOR]!.name).toBe('真仙')
    expect(REBIRTH_REFERENCE_MAJOR).toBe(WORLD_BREAK_MAJOR) // 轮回经济参照终点同指真仙
  })

  it('飞升无劫、界内有劫:真仙是唯一的「无劫门槛」', () => {
    // 真仙是飞升之赏(旧设计如此),仍保持不渡劫
    expect(REALMS[WORLD_BREAK_MAJOR]!.tribulation).toBe(false)
    // 每个界域都至少有一境要渡劫(含仙界自身)
    for (const w of WORLDS) {
      const hasTrib = REALMS.slice(w.start, w.end + 1).some(r => r.tribulation)
      expect(hasTrib, `${w.name} 没有任何渡劫境界`).toBe(true)
    }
  })

  it('回查函数越界即钳制,不返回空', () => {
    expect(realmDef(-5).id).toBe(REALMS[0]!.id)
    expect(realmDef(999).id).toBe(REALMS[MAX_MAJOR]!.id)
    expect(realmLabel(0, -1)).toContain(REALMS[0]!.name)
    expect(realmLabel(MAX_MAJOR, 999)).toContain(REALMS[MAX_MAJOR]!.name)
  })

  // ---- 可解释性:境界名不是随手堆的字,每一境都要说得出出处与承接 ----

  it('每一境都有可解释的命名出处(非空、够长)', () => {
    for (const r of REALMS) {
      expect(r.lore, `${r.name} 缺命名出处说明`).toBeTruthy()
      expect(r.lore.length, `${r.name} 的出处说明过短`).toBeGreaterThanOrEqual(12)
      expect(new Set(REALMS.map(x => x.lore)).size, '出处说明重复').toBe(REALMS.length)
    }
  })

  it('界域与出处类别自洽:人界内丹/佛道、仙界道教仙阶、神界网文、混沌海道家本源', () => {
    const allowed: Record<string, string[]> = {
      mortal: ['内丹', '佛道'],
      immortal: ['道教仙阶'],
      god: ['网文', '道家本源'],
      chaos: ['道家本源']
    }
    for (const r of REALMS) {
      expect(allowed[r.world], `${r.name} 的出处「${r.basis}」与界域「${r.world}」不符`).toContain(r.basis)
    }
  })
})
