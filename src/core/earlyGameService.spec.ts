import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import {
  dismissCaveEvent,
  dismissEnlightenment,
  getCurrentCaveEvent,
  getCurrentEnlightenment,
  mayTriggerCaveEvent,
  mayTriggerEnlightenment
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
