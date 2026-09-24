/**
 * 灵脉投资服务的核心契约:
 *   - 主脉保留 70 点上限
 *   - 副脉不设单条上限,只受灵石成本约束
 *   - 不设灵脉总投入上限
 * 这里把服务契约锁死,杜绝 UI 与服务再分叉。
 */
import { setActivePinia, createPinia } from 'pinia'
import { describe, expect, it, beforeEach } from 'vitest'
import { gn } from '@/utils/gnum'
import { VEIN_MAIN_CAPACITY } from '@/data/constants'
import { investVein, switchMainVein, veinCap } from './veinService'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'

describe('灵脉投资', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const player = usePlayerStore()
    player.major = 2 // 金丹,灵脉开放
    useResourcesStore().spiritStone = gn(1e12) // 足够覆盖长期投入
  })

  it('未定主脉时首投即成主脉,主脉仍以 70 点封顶', () => {
    const dongfu = useDongfuStore()
    expect(dongfu.veinMain).toBeNull()
    expect(veinCap('gather')).toBeNull()

    for (let i = 0; i < VEIN_MAIN_CAPACITY; i += 1) expect(investVein('gather')).toBe(true)
    expect(dongfu.veinMain).toBe('gather')
    expect(dongfu.veinPoints.gather).toBe(VEIN_MAIN_CAPACITY)
    expect(veinCap('gather')).toBe(VEIN_MAIN_CAPACITY)
    expect(investVein('gather')).toBe(false)
  })

  it('副脉不设单条上限,四条脉合计可超过 100 点', () => {
    const dongfu = useDongfuStore()

    for (let i = 0; i < VEIN_MAIN_CAPACITY; i += 1) expect(investVein('gather')).toBe(true)
    for (let i = 0; i < 100; i += 1) expect(investVein('craft')).toBe(true)
    for (let i = 0; i < 100; i += 1) expect(investVein('alchemy')).toBe(true)
    for (let i = 0; i < 100; i += 1) expect(investVein('insight')).toBe(true)

    expect(dongfu.veinTotal).toBe(VEIN_MAIN_CAPACITY + 300)
    expect(dongfu.veinTotal).toBeGreaterThan(100)
    expect(veinCap('craft')).toBeNull()
    expect(veinCap('alchemy')).toBeNull()
    expect(veinCap('insight')).toBeNull()
    expect(investVein('craft')).toBe(true)
  })

  it('改立主脉:原主脉点数保留,降为副脉后仍可继续投资', () => {
    const dongfu = useDongfuStore()
    for (let i = 0; i < 40; i += 1) investVein('gather')

    expect(switchMainVein('craft')).toBe(true)
    expect(dongfu.veinMain).toBe('craft')
    expect(dongfu.veinPoints.gather).toBe(40)
    expect(veinCap('gather')).toBeNull()
    expect(investVein('gather')).toBe(true)
    expect(dongfu.veinPoints.gather).toBe(41)

    for (let i = 0; i < 35; i += 1) expect(investVein('craft')).toBe(true)
    expect(dongfu.veinPoints.craft).toBe(35)
  })
})
