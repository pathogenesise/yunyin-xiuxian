import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ACHIEVEMENTS } from '@/data/achievements'
import { stoneByTier } from '@/core/formulas'
import { playerTier, rewardPreview } from '@/core/progress'
import { usePlayerStore } from '@/stores/player'
import { formatGN } from '@/utils/format'

describe('已达成成就展示实发奖励', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    usePlayerStore().initCharacter('成就', { roots: [] } as never)
  })

  it('境界成就的灵石行跟当前层级折算走,并带上称号', () => {
    const a = ACHIEVEMENTS.find(x => x.id === 'a_r1')!
    const text = rewardPreview(a.reward!)
    expect(text).toContain(`灵石 +${formatGN(stoneByTier(playerTier(), a.reward!.stoneTier!))}`)
    expect(text).toContain('称号')
  })

  it('成就页只在达成后接入 rewardPreview', () => {
    const src = readFileSync(resolve(__dirname, '../views/CollectionView.vue'), 'utf8')
    expect(src).toContain('rewardPreview(a.reward)')
    expect(src).toContain('done && a.reward')
  })
})
