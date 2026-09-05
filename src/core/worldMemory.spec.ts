/**
 * Phase 30.9:世界活性与服务层审计
 * S1 区域兴衰 / S2 宿敌记忆 / S3 事件余波
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  deriveProsperity,
  prosperityName,
  recordLoss,
  isNemesis,
  markAvenged,
  recordEvent,
  shouldTriggerAftermath,
  aftermathText,
  isReviving,
  prosperityYieldMult,
  NEMESIS_THRESHOLD,
  STABLE_WINS,
  FLOURISH_WINS,
  AFTERMATH_CHANCE,
  REVIVE_AFTER_HOURS,
  emptyNemeses,
  emptyEventMemories
} from './worldMemory'
import type { NemesisRecord } from '@/types'

describe('S1 区域兴衰', () => {
  const HOUR = 3600_000
  const now = Date.now()

  it('初始混乱:未镇压或胜场不足', () => {
    const r = deriveProsperity({ totalWins: 5, hasSuppressed: false, lastActivityAt: now, now })
    expect(r.prosperity).toBe('chaos')
    const r2 = deriveProsperity({ totalWins: 50, hasSuppressed: false, lastActivityAt: now, now })
    expect(r2.prosperity).toBe('chaos')
  })

  it('胜场达标 + 已镇压 → 稳定;继续积累 → 繁盛', () => {
    const stable = deriveProsperity({ totalWins: STABLE_WINS, hasSuppressed: true, lastActivityAt: now, now })
    expect(stable.prosperity).toBe('stable')
    const flourish = deriveProsperity({ totalWins: FLOURISH_WINS, hasSuppressed: true, lastActivityAt: now, now })
    expect(flourish.prosperity).toBe('flourish')
  })

  it('长期无活动但胜场达标 → 回落混乱', () => {
    const idle = deriveProsperity({
      totalWins: FLOURISH_WINS,
      hasSuppressed: true,
      lastActivityAt: now - 100 * HOUR,
      now
    })
    expect(idle.prosperity).toBe('chaos')
  })

  it('兴衰名称映射正确', () => {
    expect(prosperityName('chaos')).toBe('混乱')
    expect(prosperityName('stable')).toBe('稳定')
    expect(prosperityName('flourish')).toBe('繁盛')
  })

  it('镇压收益微调:繁盛=100%,稳定=99%,混乱=98%', () => {
    expect(prosperityYieldMult('flourish')).toBeGreaterThan(prosperityYieldMult('stable'))
    expect(prosperityYieldMult('stable')).toBeGreaterThan(prosperityYieldMult('chaos'))
    expect(prosperityYieldMult('flourish')).toBe(1.0)
  })

  it('复苏判定:超过 72 小时无活动则复苏', () => {
    const t = Date.now()
    expect(isReviving(t, t + REVIVE_AFTER_HOURS * 3600_000 + 1)).toBe(true)
    expect(isReviving(t, t + REVIVE_AFTER_HOURS * 3600_000 - 1)).toBe(false)
    expect(isReviving(undefined, t)).toBe(false)
  })
})

describe('S2 宿敌记忆', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('败北不足 3 次不成宿敌', () => {
    let list = emptyNemeses()
    for (let i = 0; i < 2; i++) {
      const r = recordLoss(list, 'e_wolf', '赤目野狼', 'qingyun', Date.now())
      list = r.list
      expect(r.becameNemesis).toBe(false)
    }
    expect(list[0]?.lossCount).toBe(2)
  })

  it('第 3 次败北标记宿敌', () => {
    let list: NemesisRecord[] = emptyNemeses()
    let flag = false
    for (let i = 0; i < NEMESIS_THRESHOLD; i++) {
      const r = recordLoss(list, 'e_wolfking', '独角妖狼', 'qingyun', Date.now())
      list = r.list
      flag = r.becameNemesis
    }
    expect(flag).toBe(true)
    expect(isNemesis(list, 'e_wolfking')).toBe(true)
  })

  it('雪耻后不再是宿敌', () => {
    let list = emptyNemeses()
    for (let i = 0; i < NEMESIS_THRESHOLD; i++) {
      list = recordLoss(list, 'e_icejiao', '玄冰蛟', 'hantan', Date.now()).list
    }
    expect(isNemesis(list, 'e_icejiao')).toBe(true)
    list = markAvenged(list, 'e_icejiao', Date.now())
    expect(isNemesis(list, 'e_icejiao')).toBe(false)
    expect(list[0]?.avengedAt).toBeDefined()
  })

  it('同敌多次败北累加,不新增条目', () => {
    let list = emptyNemeses()
    for (let i = 0; i < 5; i++) {
      list = recordLoss(list, 'e_bwking', '黑风妖王', 'heifeng', Date.now()).list
    }
    expect(list.length).toBe(1)
    expect(list[0]?.lossCount).toBe(5)
  })
})

describe('S3 事件余波', () => {
  it('未完成事件不触发余波', () => {
    expect(shouldTriggerAftermath(emptyEventMemories(), 'ev_jade_slip', 0.1)).toBe(false)
  })

  it('完成过事件:小概率触发', () => {
    const mem = recordEvent(emptyEventMemories(), 'ev_jade_slip', 0, Date.now())
    expect(shouldTriggerAftermath(mem, 'ev_jade_slip', AFTERMATH_CHANCE - 0.01)).toBe(true)
    expect(shouldTriggerAftermath(mem, 'ev_jade_slip', AFTERMATH_CHANCE + 0.01)).toBe(false)
  })

  it('记忆累加次数与最近选择', () => {
    let mem = recordEvent(emptyEventMemories(), 'ev_merchant', 1, Date.now() - 1000)
    mem = recordEvent(mem, 'ev_merchant', 2, Date.now())
    expect(mem.ev_merchant?.times).toBe(2)
    expect(mem.ev_merchant?.lastChoiceIdx).toBe(2)
  })

  it('余波文案三类', () => {
    expect(aftermathText('青石上的老者', 'good')).toContain('暖意')
    expect(aftermathText('青石上的老者', 'echo')).toContain('余韵')
    expect(aftermathText('青石上的老者', 'silence')).toContain('寂静')
  })
})
