/** 图鉴收录时间打点测试 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQuestsStore } from '@/stores/quests'
import { DAILY_TASKS, MAIN_QUESTS } from '@/data/quests'
import { MAX_MAJOR } from '@/data/realms'

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

/**
 * 主线任务链是游戏的脊梁:它曾只铺到化神(第 5 个大境界)。
 * 扩界后若忘了往下铺,玩家在 16 个新境界里会失去全部主线指引。
 */
describe('主线任务链覆盖', () => {
  it('每一个大境界都有对应的主线节点,且最后一个落在当前最高境界', () => {
    const questRealms = MAIN_QUESTS.filter(q => q.cond.type === 'realm').map(q => (q.cond as { major: number }).major)
    for (let major = 1; major <= MAX_MAJOR; major += 1) {
      expect(questRealms, `第 ${major} 个大境界没有主线节点`).toContain(major)
    }
    expect(Math.max(...questRealms), '主线终点未抵达当前最高境界').toBe(MAX_MAJOR)
  })

  it('主线 id 全局唯一,奖励/描述不缺', () => {
    expect(new Set(MAIN_QUESTS.map(q => q.id)).size).toBe(MAIN_QUESTS.length)
    for (const q of MAIN_QUESTS) {
      expect(q.name.length).toBeGreaterThan(0)
      expect(q.desc.length).toBeGreaterThan(0)
    }
  })

  it('每日任务仍为三条(扩界不得挤占日课)', () => {
    expect(DAILY_TASKS.length).toBeGreaterThanOrEqual(3)
  })
})
