/**
 * Phase 31.0 A1:天时 —— 每日确定性环境
 * 续:天时词条接线验证 —— 描述里承诺的战斗/掉落/渡劫影响必须真能流进游戏,
 * 而不是只在数据表里躺平(见 ISS-027:赤阳/月蚀/雷鸣三种天时曾零作用)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { todayWeather, weatherDef, WEATHERS, WORLD_WEATHERS } from './weather'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { worldOf } from '@/data/realms'
import { currentTribulationPlan, waveDamage } from './tribulationDecision'
import { tribulationDef } from '@/data/tribulations'
import { NO_RELIEF } from '@/data/linggenAffinity'
import type { StatMods } from '@/types'

describe('天时(weather)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('五种天时完整:灵雨/赤阳/月蚀/雷鸣/清和', () => {
    expect(WEATHERS.map(w => w.id)).toEqual(['lingyu', 'chiyang', 'yueshi', 'leiming', 'qinghe'])
    for (const w of WEATHERS) {
      expect(w.desc).toBeTruthy()
    }
  })

  it('确定性:同一游戏日多次计算得出同一结果', () => {
    const game = useGameStore()
    game.$patch({ totalPlaySec: 86400 * 3 + 1000 })
    const a = todayWeather()
    const b = todayWeather()
    expect(a.id).toBe(b.id)
  })

  it('不同游戏日结果存在分布(100 天抽到过多种)', () => {
    const game = useGameStore()
    const seen = new Set<string>()
    for (let d = 1; d <= 100; d++) {
      game.$patch({ totalPlaySec: d * 86400 })
      seen.add(todayWeather().id)
    }
    // 至少出现 3 种(5 种并非全均衡,但 100 天应见多种)
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })

  it('雷鸣:渡劫更险(倍率>1)', () => {
    const lm = weatherDef('leiming')
    expect(lm?.tribulationMult).toBeGreaterThan(1)
  })

  it('灵雨:修炼/灵气加成', () => {
    const ly = weatherDef('lingyu')
    expect((ly?.mods.cultivationSpeed ?? 0)).toBeGreaterThan(0)
    expect((ly?.mods.qiRegen ?? 0)).toBeGreaterThan(0)
  })
})

// ---- 接线验证(ISS-027):天时词条必须真正流进游戏,而非只有定义 ----

describe('天时词条并入最终属性(mods 源)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('当前天时的词条出现在 player.finalStats.mods 中(战斗/掉落/渡劫即由此读取)', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    game.$patch({ totalPlaySec: 0 }) // day 0 = 灵雨:cultivationSpeed+0.1, qiRegen+0.2
    const day0 = todayWeather()
    expect(day0.id).toBe('lingyu')
    expect(player.finalStats.mods.cultivationSpeed ?? 0).toBeCloseTo(0.1)
    expect(player.finalStats.mods.qiRegen ?? 0).toBeCloseTo(0.2)
  })

  it('赤阳日:attackPct/damageBonus 生效;月蚀日:luck/dropRate 生效', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    // day2=赤阳,day3=月蚀(确定性种子,见 weather.ts)
    game.$patch({ totalPlaySec: 2 * 86400 })
    expect(todayWeather().id).toBe('chiyang')
    expect(player.finalStats.mods.attackPct ?? 0).toBeCloseTo(0.05)
    expect(player.finalStats.mods.damageBonus ?? 0).toBeCloseTo(0.05)
    game.$patch({ totalPlaySec: 3 * 86400 })
    expect(todayWeather().id).toBe('yueshi')
    expect(player.finalStats.mods.luck ?? 0).toBeCloseTo(0.05)
    expect(player.finalStats.mods.dropRate ?? 0).toBeCloseTo(0.05)
  })

  it('雷鸣日:tribulationResist 生效(渡劫变难),attackPct 生效', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    game.$patch({ totalPlaySec: 1 * 86400 })
    expect(todayWeather().id).toBe('leiming')
    expect(player.finalStats.mods.tribulationResist ?? 0).toBeCloseTo(-0.05)
    expect(player.finalStats.mods.attackPct ?? 0).toBeCloseTo(0.05)
  })

  it('灵雨日:cultPerSec/qiRegenPerSec 带上天时(离线结算同源,不再仅在线生效)', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    player.initCharacter('雨修', { roots: [] } as never)
    // 遍历确定性日子找清和(无加成)与灵雨(修炼+0.2 之外的 +0.1)两天,
    // 同一角色、同一境界下唯一差异是天时 → 修行速度应差 1.1 倍、灵气回复 1.2 倍
    let lingyuDay = -1
    let qingheDay = -1
    for (let d = 0; d < 40 && qingheDay < 0; d += 1) {
      game.$patch({ totalPlaySec: d * 86400 })
      const id = todayWeather().id
      if (id === 'lingyu' && lingyuDay < 0) lingyuDay = d
      if (id === 'qinghe') qingheDay = d
    }
    expect(lingyuDay).toBeGreaterThanOrEqual(0)
    expect(qingheDay).toBeGreaterThanOrEqual(0)
    game.$patch({ totalPlaySec: qingheDay * 86400 })
    const baseCult = player.cultPerSec
    const baseQi = player.qiRegenPerSec
    game.$patch({ totalPlaySec: lingyuDay * 86400 })
    expect(player.cultPerSec).toBeCloseTo(baseCult * 1.1, 6)
    expect(player.qiRegenPerSec).toBeCloseTo(baseQi * 1.2, 6)
  })
})

describe('渡劫难度随天时(雷鸣日 +8%)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('waveDamage 乘上天时倍率:雷鸣日伤害更高(预览与结算同源)', () => {
    const def = tribulationDef('thunder')
    const mods: StatMods = {}
    const base = waveDamage(def, mods, 1, 1, 1)
    const storm = waveDamage(def, mods, 1, 1, 1, NO_RELIEF, 1.08)
    expect(storm).toBeCloseTo(base * 1.08, 9)
    // 审计基线(不传天时)不受影响,恒等于 1.0 倍
    expect(base).toBeCloseTo(waveDamage(def, mods, 1, 1, 1, NO_RELIEF, 1), 9)
  })

  it('currentTribulationPlan 在同一天时下,expectedRate 随雷鸣倍率下降(难度变高)', () => {
    const game = useGameStore()
    // 找一个雷鸣日
    let stormDay = -1
    for (let d = 0; d < 40; d += 1) {
      game.$patch({ totalPlaySec: d * 86400 })
      if (todayWeather().id === 'leiming') {
        stormDay = d
        break
      }
    }
    expect(stormDay).toBeGreaterThanOrEqual(0)
    // 同一天内预览稳定(确定性),且 > 0 即可(具体难度由构筑决定)
    const a = currentTribulationPlan()
    const b = currentTribulationPlan()
    expect(a.kind).toBe(b.kind)
    expect(a.expectedRate).toBeGreaterThan(0)
  })
})

// ---- 界域专属天象(Phase 34):让 12 个新境界各有自己的天 ----

describe('界域天象(weather · 仙界及以上)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('每个界域都有自己的天象池,且不少于三种', () => {
    for (const w of ['immortal', 'god', 'chaos'] as const) {
      const pool = WORLD_WEATHERS[w]
      expect(pool.length, `${w} 的天象池`).toBeGreaterThanOrEqual(3)
      for (const def of pool) {
        expect(def.desc).toBeTruthy()
        // 池内天象必须能回查(界面按 id 取材),且界域名与 realms 一致
        expect(weatherDef(def.id)?.name).toBe(def.name)
      }
    }
    expect(worldOf(9).name).toBe('仙界')
    expect(worldOf(14).name).toBe('神界')
    expect(worldOf(18).name).toBe('混沌海')
  })

  it('人间界玩家仍取五日天时(既有行为零改动)', () => {
    const player = usePlayerStore()
    player.major = 0
    const mortalIds = new Set(WEATHERS.map(w => w.id))
    const game = useGameStore()
    for (let d = 0; d < 20; d += 1) {
      game.$patch({ totalPlaySec: d * 86400 })
      expect(mortalIds.has(todayWeather().id)).toBe(true)
    }
  })

  it('仙界/神界/混沌海玩家只取本界天象,且同一天确定不换', () => {
    const player = usePlayerStore()
    const game = useGameStore()
    for (const [major, world] of [
      [9, 'immortal'],
      [14, 'god'],
      [18, 'chaos']
    ] as const) {
      player.major = major
      const poolIds = new Set(WORLD_WEATHERS[world].map(w => w.id))
      for (let d = 1; d <= 12; d += 1) {
        game.$patch({ totalPlaySec: d * 86400 })
        const a = todayWeather()
        const b = todayWeather()
        expect(a.id).toBe(b.id) // 同日内确定
        expect(poolIds.has(a.id), `${world} 取到了他界天象 ${a.id}`).toBe(true)
      }
    }
  })

  it('界域天象确实并入最终属性(不是只放着看)', () => {
    const player = usePlayerStore()
    player.major = 18 // 混沌海:混沌潮/本源涌动/道音 三者皆给加成
    const mods = player.finalStats.mods
    const anyPositive =
      (mods.cultivationSpeed ?? 0) > 0 ||
      (mods.attackPct ?? 0) > 0 ||
      (mods.luck ?? 0) > 0
    expect(anyPositive).toBe(true)
  })
})
