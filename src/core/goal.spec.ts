/**
 * 修行目标(Phase 29)接线契约 —— goal.ts 此前从未被展示,先把纯函数行为钉死。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAdventureStore } from '@/stores/adventure'
import { useResourcesStore } from '@/stores/resources'
import { useInventoryStore } from '@/stores/inventory'
import { gn, toNum, gnZero } from '@/utils/gnum'
import { generateCurrentGoal } from './goal'

const { setBuild } = vi.hoisted(() => ({ setBuild: { value: null as unknown } }))
vi.mock('./buildDetect', () => ({ detectBuild: () => setBuild.value }))

describe('修行目标(Phase 29)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setBuild.value = null
  })

  it('死后无目标', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.markDead()
    expect(generateCurrentGoal(player)).toBeNull()
  })

  it('修为 85% 以上 → 突破目标,给 hint', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gn(Math.floor(toNum(player.expReq) * 0.9))
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('breakthrough')
    expect(goal.text).toContain('突破')
    expect(goal.hint).toBeTruthy()
  })

  it('修为 50%~85% → 突破目标,无 hint(未临近,不给多余建议)', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gn(Math.floor(toNum(player.expReq) * 0.6))
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('breakthrough')
    expect(goal.hint).toBeUndefined()
  })

  it('无临近突破且已有 Build → build 目标,进度 = 核心词条数/4', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    setBuild.value = {
      style: { name: '天龙' },
      coreValues: [{ key: 'critChance' }, { key: 'critDamage' }]
    }
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('build')
    expect(goal.text).toContain('天龙')
    expect(goal.progress).toBe(0.5)
  })

  it('近突破优先于 build(breakthrough 检查在最前)', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    setBuild.value = { style: { name: '玄武' }, coreValues: [{ key: 'x' }] }
    player.exp = gn(Math.floor(toNum(player.expReq) * 0.95))
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('breakthrough')
  })

  it('无临近突破、无 build → explore 目标(未探索且可入的地界)', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    // 默认 unlocked=['qingyun']、cleared=[] → 还有可深入的地界
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('explore')
    expect(goal.text).toContain('深入')
  })

  it('已遍历的图清净空、库存与装备皆足 → 真兜底返回 null(不硬塞建议)', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    // 把所有已解锁地界都通关,探索目标消失
    useAdventureStore().cleared = [...useAdventureStore().unlocked]
    // 材料/装备也都不缺 → 没有可挤的建议就闭嘴
    useResourcesStore().herb = 12
    for (const slot of ['weapon', 'head', 'body', 'wrist', 'belt', 'boots', 'necklace', 'ring', 'talisman'] as const) {
      useInventoryStore().equip(`u-${slot}`, slot)
    }
    expect(generateCurrentGoal(player)).toBeNull()
  })

  it('通关过地界但灵草见底(herb<10) → material 目标,指向最高层级已通关地界', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    const adventure = useAdventureStore()
    adventure.unlocked = ['qingyun', 'luoxia']
    adventure.cleared = ['qingyun', 'luoxia'] // 无未通关地界 → explore 不触发
    useResourcesStore().herb = 3
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('material')
    expect(goal.text).toContain('采')
    expect(goal.text).toContain('落霞谷') // tier 2 > tier 1,指最高的
    expect(goal.progress).toBe(0.3)
    expect(goal.hint).toBeTruthy()
  })

  it('灵草充足(herb>=10) → material 不触发', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    const adventure = useAdventureStore()
    adventure.unlocked = ['qingyun']
    adventure.cleared = ['qingyun']
    for (const slot of ['weapon', 'head', 'body', 'wrist', 'belt', 'boots', 'necklace', 'ring', 'talisman'] as const) {
      useInventoryStore().equip(`u-${slot}`, slot)
    }
    useResourcesStore().herb = 12
    expect(generateCurrentGoal(player)).toBeNull()
  })

  it('通关过地界、灵草足、装备槽有空位 → equipment 目标,指向第一个空槽且带进度', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    const adventure = useAdventureStore()
    adventure.unlocked = ['qingyun']
    adventure.cleared = ['qingyun']
    // weapon、head 已填 → 优先级里第一个空槽是 body(衣袍)
    useInventoryStore().equip('u-weapon', 'weapon')
    useInventoryStore().equip('u-head', 'head')
    useResourcesStore().herb = 12
    const goal = generateCurrentGoal(player)!
    expect(goal.type).toBe('equipment')
    expect(goal.text).toContain('寻一件')
    expect(goal.text).toContain('衣袍')
    expect(goal.progress).toBeCloseTo(2 / 9)
    expect(goal.hint).toBeTruthy()
  })

  it('从未通关过地界(cleared 为空) → 即便灵草与装备皆缺也不硬塞(宁缺毋滥)', () => {
    const player = usePlayerStore()
    player.initCharacter('目标', { roots: [] } as never)
    player.exp = gnZero()
    const adventure = useAdventureStore()
    adventure.unlocked = []
    adventure.cleared = []
    useResourcesStore().herb = 0 // 灵草见底
    expect(generateCurrentGoal(player)).toBeNull()
  })
})
