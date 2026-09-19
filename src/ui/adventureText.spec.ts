import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EXPLORE_BATTLE_INTERVAL, EXPLORE_MODES } from '@/data/constants'
import { PETS } from '@/data/pets'
import { exploreBattleGapSec, exploreDurationSec, exploreRewardMult } from '@/core/exploration'
import { personalityEffects } from '@/core/petPersonality'
import { departButtonText } from './adventureText'

describe('出发按钮与结算同一套数', () => {
  it('行程按灵兽之性折算,与 startExploration 同一公式', () => {
    expect(exploreDurationSec('normal', null)).toBe(EXPLORE_MODES.normal.durationSec)
    const seen = new Set<string>()
    for (const pet of PETS) {
      if (seen.has(pet.personality)) continue
      seen.add(pet.personality)
      const mult = personalityEffects(pet.id).exploreDurMult
      expect(exploreDurationSec('deep', pet.id)).toBe(Math.round(EXPLORE_MODES.deep.durationSec * mult))
    }
    expect(seen.size).toBe(4)
  })

  it('遇敌间隔只看历练遇敌,收益无事件时就是档位', () => {
    expect(exploreBattleGapSec(0)).toBe(EXPLORE_BATTLE_INTERVAL)
    expect(exploreBattleGapSec(0.3)).toBeCloseTo(EXPLORE_BATTLE_INTERVAL / 1.3, 9)
    expect(exploreRewardMult('risky', null)).toBe(EXPLORE_MODES.risky.rewardMult)
  })

  it('按钮文案带上四个结算数', () => {
    const line = departButtonText({ durationSec: 1800, rewardMult: 1.4, dangerMult: 1.45, battleGapSec: 12 })
    expect(line).toContain('30分0秒')
    expect(line).toContain('收益 ×1.4')
    expect(line).toContain('遇险 ×1.45')
    expect(line).toContain('遇敌约 12秒')
  })

  it('历练页出发按钮不再手抄档位原时长', () => {
    const view = readFileSync(new URL('../views/AdventureView.vue', import.meta.url), 'utf8')
    expect(view).toContain('departButtonText')
    expect(view).toContain('exploreDurationSec')
    expect(view).toContain('explorationFoeDanger')
    expect(view).not.toContain('EXPLORE_MODES[m.id].durationSec')
  })
})
