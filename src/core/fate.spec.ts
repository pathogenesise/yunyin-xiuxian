/* eslint-disable no-console -- 命盘是过程性验收,打印命宫落星 */
/**
 * 命格验收(Phase 34.4)
 *
 * 紫微这一门的诚实之处写在数据注释里:没有生辰就不排真盘,只取十二宫与十四主星的象义。
 * 那么它必须守住的三条是:
 *
 *   一 十四主星各有其位 —— 不多不少,不重不漏(布不满就是假盘);
 *   二 同一个人同一世算多少次都是同一张盘(确定性),转世才重算;
 *   三 命格之力真的并入 finalStats —— 又是一门"看得见拿不到"的反面教材预防。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LinggenProfile } from '@/types'
import { PALACES, STARS } from '@/data/ziwei'
import { fateChart, fateLordLine, fateMods, fateSeed } from './fate'
import { usePlayerStore } from '@/stores/player'

function linggen(ratioA: number, ratioB: number): LinggenProfile {
  return {
    roots: [
      { element: 'fire', aptitude: ratioA },
      { element: 'water', aptitude: ratioB }
    ],
    growthMult: 1,
    gradeName: '双灵根'
  } as unknown as LinggenProfile
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('紫微 · 十二宫十四星', () => {
  it('十二宫与十四主星齐备,字段不空', () => {
    expect(PALACES.length).toBe(12)
    expect(STARS.length).toBe(14)
    expect(new Set(PALACES.map(p => p.id)).size).toBe(12)
    expect(new Set(STARS.map(s => s.id)).size).toBe(14)
    for (const p of PALACES) {
      expect(p.domain.length, `${p.name} 无所主`).toBeGreaterThan(0)
      expect(p.use.length, `${p.name} 未说明在游戏里管什么`).toBeGreaterThan(0)
    }
    for (const s of STARS) {
      expect(s.gist.length, `${s.name} 无星义`).toBeGreaterThan(4)
      expect(Object.keys(s.mods).length, `${s.name} 无可用通道`).toBeGreaterThan(0)
    }
  })

  it('安星:十四主星各安其位,不重不漏', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const chart = fateChart(seed * 7919)
      const all = chart.palaces.flatMap(p => p.stars.map(s => s.id))
      expect(all.length, `seed ${seed} 布星数不对`).toBe(14)
      expect(new Set(all).size, `seed ${seed} 有星重复`).toBe(14)
      for (const p of chart.palaces) expect(p.stars.length, `${p.palace.name} 空宫`).toBeGreaterThanOrEqual(1)
    }
  })

  it('命宫必有两星(十四入十二,余星归命宫与对宫),题眼取命宫首星', () => {
    const chart = fateChart(12345)
    const ming = chart.palaces.find(p => p.palace.id === 'ming')!
    expect(ming.stars.length).toBe(2)
    expect(chart.lord.id).toBe(ming.stars[0]!.id)
    expect(fateLordLine(chart)).toContain('命宫落')
  })
})

describe('紫微 · 一世一算', () => {
  it('同灵根同转世数:算多少次都是同一张盘', () => {
    const seed = fateSeed(linggen(60, 40), 3)
    const a = fateChart(seed)
    const b = fateChart(seed)
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('转世即重算:转世数变了,命盘种子必变', () => {
    const s1 = fateSeed(linggen(60, 40), 1)
    const s2 = fateSeed(linggen(60, 40), 2)
    expect(s2).not.toBe(s1)
  })

  it('灵根变了(转世重掷灵根),命盘也随之再排', () => {
    expect(fateSeed(linggen(80, 20), 1)).not.toBe(fateSeed(linggen(20, 80), 1))
  })

  it('不同命种多数会排出不同的命宫落星(不是一张盘糊弄所有人)', () => {
    const lords = new Set<string>()
    for (let count = 0; count < 12; count += 1) {
      const chart = fateChart(fateSeed(linggen(60, 40), count))
      lords.add(chart.lord.name)
    }
    expect(lords.size).toBeGreaterThan(1)
    console.log(`\n十二世命宫落星:${[...lords].join('、')}`)
  })
})

describe('紫微 · 命格之力真的进属性', () => {
  it('十二宫之星相合,得一世之格', () => {
    const chart = fateChart(fateSeed(linggen(50, 50), 0))
    const mods = fateMods(chart)
    expect(Object.keys(mods).length).toBeGreaterThan(0)
    // 与卦不同:命格是底色,单通道不得压过问卦那种一时之盛
    for (const v of Object.values(mods)) expect(Math.abs(v as number)).toBeLessThan(0.2)
  })

  it('玩家的命格由灵根与转世推出,并并入 finalStats', () => {
    const player = usePlayerStore()
    player.initCharacter('测试', linggen(60, 40))
    const mods = player.fateMods
    const keys = Object.keys(mods)
    expect(keys.length).toBeGreaterThan(0)
    for (const k of keys) {
      expect(player.finalStats.mods[k as keyof typeof player.finalStats.mods] ?? 0).not.toBe(0)
    }
    console.log(`\n${fateLordLine(player.fateChart)}`)
  })

  it('界域志把命盘摊开:十二宫、十四主星与命宫题眼都在页面上', () => {
    const src = readFileSync(resolve(__dirname, '../views/RealmCodexView.vue'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    // 只认"用过"的形态(列表渲染与派生调用),不认 import 那一行
    for (const token of ['in fateRows', 'fateLordLine(', 'in STARS', 'player.fateMods']) {
      expect(src, `界域志没有接上 ${token}`).toContain(token)
    }
  })
})
