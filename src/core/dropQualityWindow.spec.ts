/**
 * 掉落的品质口径 —— 普通掉落吃品质窗口,只有剧情例外不吃
 *
 * GenOptions.minQualityRank 只要给了(哪怕是 0)就算「显式下限」,品质窗口整个失效。
 * 在线普通战曾传 `minQualityRank: isBoss ? 1 : 0`,镇压产出传 `minQualityRank: 0`:
 * 两条在线路径都绕过了窗口,而离线历练与平衡审计都吃窗口 —— 在线比审计口径
 * 多掉一截低阶高品(在线 / 离线不同源)。
 *
 * 这里不数源码字面量,直接截下这几条路径交给生成器的参数:
 *   一 在线普通战、镇压产出:不带品质下限;
 *   二 首领:带下限 1(剧情例外,照旧不吃窗口);
 *   三 窗口本身是活的:同一层级,带不带下限,窗口外品质的权重差出数量级。
 * 故障注入:loot.ts 普通战改回传 `minQualityRank: 0` → 第一条红。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const genCalls = vi.hoisted(() => [] as { tier: number; opts: Record<string, unknown> }[])
vi.mock('./equipGen', async orig => {
  const mod = await orig<typeof import('./equipGen')>()
  return {
    ...mod,
    generateEquipment: (tier: number, r: Parameters<typeof mod.generateEquipment>[1], opts: Parameters<typeof mod.generateEquipment>[2] = {}) => {
      genCalls.push({ tier, opts: { ...opts } })
      return mod.generateEquipment(tier, r, opts)
    }
  }
})

import { afterWin } from './loot'
import { settleSuppressedRegions } from './suppress'
import { qualityWeightAt } from './equipGen'
import { regionDef } from '@/data/regions'
import { qualityDef } from '@/data/qualities'
import { RandomService, mulberry32, rng } from '@/utils/random'
import { usePlayerStore } from '@/stores/player'

describe('掉落的品质口径 · 普通掉落吃品质窗口', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    genCalls.length = 0
    vi.restoreAllMocks()
  })

  it('在线普通战交给生成器的参数不带品质下限(与离线、审计同口径)', () => {
    vi.spyOn(rng, 'chance').mockReturnValue(true)
    afterWin(regionDef('qingyun')!, 1, false)
    expect(genCalls.length, '普通战一件装备都没生成,判据没跑到东西').toBeGreaterThan(0)
    for (const c of genCalls) expect(c.opts.minQualityRank, '传了下限就不吃品质窗口').toBeUndefined()
  })

  it('首领照旧带下限 1(剧情例外)', () => {
    vi.spyOn(rng, 'chance').mockReturnValue(false)
    afterWin(regionDef('qingyun')!, 1, true)
    expect(genCalls.length).toBeGreaterThan(0)
    expect(genCalls[0]!.opts.minQualityRank).toBe(1)
  })

  it('镇压产出交给生成器的参数不带品质下限', () => {
    const player = usePlayerStore()
    player.suppressedRegions = ['wanyao']
    player.suppressedSince = { wanyao: Date.now() }
    // 十小时 × 每小时 0.4 件:至少掉四件
    settleSuppressedRegions(10 * 3600, new RandomService(mulberry32(5)))
    expect(genCalls.length, '镇压一件装备都没产出,判据没跑到东西').toBeGreaterThan(0)
    for (const c of genCalls) expect(c.opts.minQualityRank).toBeUndefined()
  })

  it('窗口是活的:一阶上灵品在窗口外,带下限 0 时权重高出两个数量级以上', () => {
    const spirit = qualityDef('spirit')
    expect(spirit.fromTier).toBeGreaterThan(1)
    const windowed = qualityWeightAt(spirit, 1, {})
    const bypassed = qualityWeightAt(spirit, 1, { minQualityRank: 0 })
    expect(bypassed / windowed).toBeGreaterThan(100)
  })
})
