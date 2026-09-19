import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DAILY_TASKS } from '@/data/quests'
import { stoneByTier } from '@/core/formulas'
import { grantReward, playerTier, rewardPreview, track } from '@/core/progress'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import { formatGN } from '@/utils/format'

describe('rewardPreview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    usePlayerStore().initCharacter('领赏', { roots: [] } as never)
  })

  it('灵石行与 stoneByTier 入账是同一个数', () => {
    const task = DAILY_TASKS.find(t => t.reward.stoneTier)!
    const text = rewardPreview(task.reward)
    const amount = formatGN(stoneByTier(playerTier(), task.reward.stoneTier!))
    expect(text).toContain(`灵石 +${amount}`)
    expect(grantReward(task.reward, true).join(' · ')).toBe(text)
  })

  it('日课完成提示带上实发清单,主页也用同一函数', () => {
    const herb = DAILY_TASKS.find(t => t.id === 'd_pill')!
    track('pillsUsed', herb.target)
    const toast = useUiStore().toasts.find(t => t.text.includes(herb.name))
    expect(toast?.text).toContain(rewardPreview(herb.reward))
    const home = readFileSync(resolve(__dirname, '../views/HomeView.vue'), 'utf8')
    expect(home).toContain('rewardPreview(')
    expect(home).not.toContain('达成后自动领赏')
  })
})
