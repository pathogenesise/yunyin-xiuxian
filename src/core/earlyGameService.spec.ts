import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { gn, toNum } from '@/utils/gnum'
import {
  dismissCaveEvent,
  dismissEnlightenment,
  getCurrentCaveEvent,
  getCurrentEnlightenment,
  mayTriggerCaveEvent,
  mayTriggerEnlightenment,
  recordWin,
  recordLoss,
  prepareBreakthrough,
  breakthroughPrepState,
  consumeBreakthroughPrep
} from './earlyGameService'
import { BREAKTHROUGH_PREP_OPTIONS } from '@/data/earlyGame'

describe('洞府巡游(Phase 28)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('当日已巡游后不再触发', () => {
    const player = usePlayerStore()
    const today = Math.floor(Date.now() / 86400000)
    player.markCaveEventToday(today)
    expect(mayTriggerCaveEvent()).toBeNull()
  })

  it('触发后 getCurrentCaveEvent 能取到,离开则清除并占用今日', () => {
    const player = usePlayerStore()
    const ev = mayTriggerCaveEvent()
    expect(ev).not.toBeNull()
    expect(getCurrentCaveEvent()).not.toBeNull()

    const today = Math.floor(Date.now() / 86400000)
    dismissCaveEvent()
    // 模块态清空
    expect(getCurrentCaveEvent()).toBeNull()
    // 离开占用今日:轮询再也不会掷一个新事件出来
    expect(player.lastCaveEventDay).toBe(today)
    expect(mayTriggerCaveEvent()).toBeNull()
  })
})

describe('悟道顿悟(Phase 28)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('忽略后模块态清空,getCurrentEnlightenment 取不到', () => {
    // 8% 概率 + 5 分钟冷却,直接触发一次
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    mayTriggerEnlightenment()
    const ev = getCurrentEnlightenment()
    expect(ev).not.toBeNull()

    dismissEnlightenment()
    expect(getCurrentEnlightenment()).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('连胜(Phase 28 · 曾经无调用方,TASK-022 接线后)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('第 3/5/10 连胜发放对应奖励,中间档不发', () => {
    const player = usePlayerStore()
    const resources = useResourcesStore()
    player.initCharacter('连胜测试', { roots: [] } as never)

    player.winStreak = 2
    recordWin()
    expect(player.winStreak).toBe(3)
    expect(toNum(resources.spiritStone)).toBe(20)
    expect(resources.wudao).toBe(1)

    recordWin() // 4:非奖励档
    expect(player.winStreak).toBe(4)
    expect(toNum(resources.spiritStone)).toBe(20)

    player.winStreak = 4
    recordWin() // 5
    expect(toNum(resources.spiritStone)).toBe(60)
    expect(resources.wudao).toBe(3)

    player.winStreak = 9
    recordWin() // 10
    expect(toNum(resources.spiritStone)).toBe(160)
    expect(resources.wudao).toBe(8)
  })

  it('败北重置连胜', () => {
    const player = usePlayerStore()
    player.initCharacter('连胜测试', { roots: [] } as never)
    player.winStreak = 7
    recordLoss()
    expect(player.winStreak).toBe(0)
  })
})

describe('突破准备(Phase 28 · TASK-023 接线后)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    consumeBreakthroughPrep() // 清掉上个用例残留的准备态(模块级单例)
  })

  it('静坐调息:开始为坐定态,3 分钟完转为就绪,+8% 一次性可取', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000_000)
      expect(prepareBreakthrough('meditate')).toBe(true)

      let s = breakthroughPrepState()
      expect(s.sitting).toBe(true)
      expect(s.ready).toBe(false)
      expect(s.remainingSec).toBe(180)
      // 坐定未完,突破无加成可取,且不耗准备
      expect(consumeBreakthroughPrep()).toBe(0)
      expect(s.sitting).toBe(true)

      vi.advanceTimersByTime(181_000)
      s = breakthroughPrepState()
      expect(s.sitting).toBe(false)
      expect(s.ready).toBe(true)
      expect(s.bonus).toBeCloseTo(0.08)

      expect(consumeBreakthroughPrep()).toBeCloseTo(0.08)
      // 一次性:取过即空
      expect(consumeBreakthroughPrep()).toBe(0)
      expect(breakthroughPrepState().ready).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('服聚气丹:支付 80 灵石立即可取 +5%;灵石不足则拒绝', () => {
    const resources = useResourcesStore()
    resources.addStone(gn(100))

    expect(prepareBreakthrough('pill')).toBe(true)
    // GNum 减法在整数量级有浮点尾噪(19.9999…),显示层 formatGN 已兜底,断言取容差
    expect(toNum(resources.spiritStone)).toBeCloseTo(20)
    expect(breakthroughPrepState().ready).toBe(true)
    expect(breakthroughPrepState().bonus).toBeCloseTo(0.05)
    expect(consumeBreakthroughPrep()).toBeCloseTo(0.05)

    // 灵石不足:拒绝且不动加成
    resources.$patch({ spiritStone: gn(10) })
    expect(prepareBreakthrough('pill')).toBe(false)
    expect(breakthroughPrepState().ready).toBe(false)
  })
})

describe('突破准备数据源(BREAKTHROUGH_PREP_OPTIONS · TASK-029 接线后)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    consumeBreakthroughPrep()
  })

  it('备选数值与数据表一致:加成/时长/药价读数据,不硬编码', () => {
    const meditate = BREAKTHROUGH_PREP_OPTIONS.find(o => o.id === 'meditate')!
    const pill = BREAKTHROUGH_PREP_OPTIONS.find(o => o.id === 'pill')!
    const pillCost = pill.cost?.stone ?? 0
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000_000)
      prepareBreakthrough('meditate')
      // 坐满数据表里的时长后,加成 = 数据表 bonusRate(不再是某处硬编码的 0.08)
      vi.advanceTimersByTime(meditate.duration * 1000 + 1000)
      expect(breakthroughPrepState().bonus).toBeCloseTo(meditate.bonusRate)
      expect(consumeBreakthroughPrep()).toBeCloseTo(meditate.bonusRate)

      // 聚气丹:药价与加成都来自数据表
      const resources = useResourcesStore()
      resources.addStone(gn(pillCost + 1))
      expect(prepareBreakthrough('pill')).toBe(true)
      expect(toNum(resources.spiritStone)).toBeCloseTo(1)
      expect(breakthroughPrepState().bonus).toBeCloseTo(pill.bonusRate)
      expect(consumeBreakthroughPrep()).toBeCloseTo(pill.bonusRate)
    } finally {
      vi.useRealTimers()
    }
  })

  it('direct(直接突破)不是准备动作:不产生加成,也不报错', () => {
    expect(BREAKTHROUGH_PREP_OPTIONS.some(o => o.id === 'direct')).toBe(true)
    expect(prepareBreakthrough('direct')).toBe(false)
    expect(breakthroughPrepState().ready).toBe(false)
  })
})

describe('前期事件衰减(EARLY_EVENT_DECAY · TASK-028 接线后)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // 隔离约束:earlyGameService 是模块级单例态,顿悟的 5 分钟冷却与遗留事件会跨用例泄漏。
  // 因此把所有"不应触发"用例排在前面(它们统一把假时钟钉在"本文件前期真实触发点 +600s",
  // 稳定越过冷却,只测衰减);唯一一个"应触发"用例(会写入 lastEnlightenmentTime)排最后。
  // useFakeTimers 与 Date.now 交互下,lastEnlightenmentTime 只会被真正触发的那次写入,
  // 前面的用例看到的一直是"早期真实时间触发点",彼此互不污染。
  it('真仙后顿悟完全退出(衰减 0)', () => {
    const player = usePlayerStore()
    player.major = 5
    const realNow = Date.now()
    vi.useFakeTimers()
    try {
      vi.setSystemTime(realNow + 600_000) // 越过 5 分钟模块级冷却,只测衰减
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // 即使随机数最小也不该触发
      mayTriggerEnlightenment()
      expect(getCurrentEnlightenment()).toBeNull()
      vi.restoreAllMocks()
    } finally {
      vi.useRealTimers()
    }
  })

  it('金丹(境界2)顿悟触发率按曲线 0.35 收窄:高随机数不再触发', () => {
    const player = usePlayerStore()
    player.major = 2
    const realNow = Date.now()
    vi.useFakeTimers()
    try {
      vi.setSystemTime(realNow + 600_000)
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 > 0.08×0.35
      mayTriggerEnlightenment()
      expect(getCurrentEnlightenment()).toBeNull()
      vi.restoreAllMocks()
    } finally {
      vi.useRealTimers()
    }
  })

  it('元婴后洞府巡游退出,不占用当日', () => {
    const player = usePlayerStore()
    player.major = 3 // cavePatrol.yuanying = 0
    expect(mayTriggerCaveEvent()).toBeNull()
    expect(player.lastCaveEventDay).toBe(0)
  })

  it('金丹巡游存在感 0.25:掷败则今日让位(不反复重掷)', () => {
    const player = usePlayerStore()
    player.major = 2
    const today = Math.floor(Date.now() / 86400000)
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 > 0.25 → 今日让位
    expect(mayTriggerCaveEvent()).toBeNull()
    expect(player.lastCaveEventDay).toBe(today)
    vi.restoreAllMocks()
  })

  // 最后一个顿悟用例:低随机数在金丹仍可触发(0.08×0.35 之上),写入 lastEnlightenmentTime
  it('低随机数在金丹仍可触发(0.08×0.35 之上)', () => {
    const player = usePlayerStore()
    player.major = 2
    const realNow = Date.now()
    vi.useFakeTimers()
    try {
      vi.setSystemTime(realNow + 600_000)
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // 0.001 ≤ 0.028 → 触发
      mayTriggerEnlightenment()
      expect(getCurrentEnlightenment()).not.toBeNull()
      vi.restoreAllMocks()
    } finally {
      vi.useRealTimers()
    }
  })

  it('金丹巡游存在感 0.25:掷中则在当日出现', () => {
    const player = usePlayerStore()
    player.major = 2
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // 0.1 ≤ 0.25 → 触发
    expect(mayTriggerCaveEvent()).not.toBeNull()
    vi.restoreAllMocks()
  })
})
