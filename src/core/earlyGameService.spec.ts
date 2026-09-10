import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { toNum } from '@/utils/gnum'
import {
  dismissCaveEvent,
  dismissEnlightenment,
  getCurrentCaveEvent,
  getCurrentEnlightenment,
  mayTriggerCaveEvent,
  mayTriggerEnlightenment,
  recordWin,
  recordLoss
} from './earlyGameService'

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
