/**
 * 转世「新的一世」—— 本世进程清零、跨世记忆保留(ISS-015 / TASK-009)
 *
 * 边界(与 DEC-003 对齐):
 *   - 必清:连胜/当日巡游/进行中的秘境/进行中的区域事件 —— 它们属「这一世」的当下
 *   - 保留:镇压与区域兴衰(「成长改变世界」的世界记忆)、机缘选择记忆
 *     (fortuneChoices,「世界记得你的选择」)、奇遇连锁(eventChains)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import type { SecretRealmState } from '@/core/secretRealm'

function seedPlayer(p: ReturnType<typeof usePlayerStore>): void {
  p.winStreak = 7
  p.lastCaveEventDay = 5
  p.secretRealm = { realmId: 'sr_kurong', enteredAt: 1, layer: 2, wins: 5, losses: 0, spoils: [], rules: [], finished: false } as SecretRealmState
  p.regionEvent = { regionId: 'qingyun', eventId: 'ev_raiders', endsAt: 9e15 } as never
  // 跨世记忆:全保留
  p.suppressedRegions = ['qingyun']
  p.fortuneChoices = { ft_sword_remnant: 'take' }
  p.eventChains = { old_man_stone: 2 }
}

describe('player.rebirth 转世状态重置', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('清空本世进程:连胜/当日巡游/秘境/区域事件', () => {
    const p = usePlayerStore()
    p.initCharacter('测试道友', { roots: [] } as never)
    seedPlayer(p)

    p.rebirth({ roots: [] } as never)

    expect(p.winStreak).toBe(0)
    expect(p.lastCaveEventDay).toBe(0)
    expect(p.secretRealm).toBeNull()
    expect(p.regionEvent).toBeNull()
  })

  it('保留跨世记忆:镇压/机缘选择/奇遇连锁', () => {
    const p = usePlayerStore()
    p.initCharacter('测试道友', { roots: [] } as never)
    seedPlayer(p)

    p.rebirth({ roots: [] } as never)

    // 「成长改变世界」:镇压过的区域仍记住你
    expect(p.suppressedRegions).toEqual(['qingyun'])
    // 「世界记得你的选择」:机缘取/弃记忆不随转世清空
    expect(p.fortuneChoices).toEqual({ ft_sword_remnant: 'take' })
    expect(p.eventChains).toEqual({ old_man_stone: 2 })
  })
})
