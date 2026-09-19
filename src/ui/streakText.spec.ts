import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WIN_STREAK_REWARDS } from '@/data/earlyGame'
import { recordWin } from '@/core/earlyGameService'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import { streakRewardText } from './streakText'

describe('streakRewardText', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('连胜到档时提示与刚入账的灵石、悟道点一致', () => {
    const player = usePlayerStore()
    player.initCharacter('连胜', { roots: [] } as never)
    const tier = WIN_STREAK_REWARDS[0]!
    player.winStreak = tier.streak - 1
    recordWin()
    const text = useUiStore().toasts.at(-1)?.text ?? ''
    expect(text).toBe(streakRewardText(tier.streak, tier.stone, tier.wudao))
    expect(text).toContain(String(tier.stone))
    expect(text).toContain(String(tier.wudao))
  })

  it('非奖励档不弹提示', () => {
    const player = usePlayerStore()
    player.initCharacter('连胜', { roots: [] } as never)
    player.winStreak = 0
    recordWin()
    expect(useUiStore().toasts).toHaveLength(0)
  })
})
