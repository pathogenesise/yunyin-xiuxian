/** 图鉴收录时间打点测试 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQuestsStore } from '@/stores/quests'

describe('图鉴收录', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('首次收录记下时间戳,重复收录不覆盖', () => {
    const quests = useQuestsStore()
    const before = Date.now()
    expect(quests.collect('gongfa', 'gf-test')).toBe(true)
    const stamp = quests.collectedAt['gongfa:gf-test']
    expect(stamp).toBeGreaterThanOrEqual(before)

    expect(quests.collect('gongfa', 'gf-test')).toBe(false)
    expect(quests.collectedAt['gongfa:gf-test']).toBe(stamp)
  })

  it('不同类别互不串扰', () => {
    const quests = useQuestsStore()
    quests.collect('equip', 'same-id')
    quests.collect('pill', 'same-id')
    expect(quests.collections.equip).toContain('same-id')
    expect(quests.collections.pill).toContain('same-id')
    expect(quests.collectedAt['equip:same-id']).toBeDefined()
    expect(quests.collectedAt['pill:same-id']).toBeDefined()
  })
})
