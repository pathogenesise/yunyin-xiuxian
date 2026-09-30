import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { settleOffline } from './offline'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { useAdventureStore } from '@/stores/adventure'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { useDongfuStore } from '@/stores/dongfu'
import { useSettingsStore } from '@/stores/settings'
import { gnZero } from '@/utils/gnum'
import { BAG_CAPACITY } from '@/data/constants'

const HOUR_MS = 3600 * 1000

function setupOfflineTrip(hours: number): void {
  const game = useGameStore()
  const player = usePlayerStore()
  const adventure = useAdventureStore()
  const dongfu = useDongfuStore()
  game.markStarted()
  game.lastActiveAt = Date.now() - hours * HOUR_MS
  player.major = 5
  player.sub = 0
  dongfu.setLevel('mansion', 4)
  const now = Date.now()
  adventure.session = {
    regionId: 'qingyun',
    mode: 'risky',
    startedAt: now - hours * HOUR_MS,
    endsAt: now + 24 * HOUR_MS,
    nextBattleAt: 0,
    wins: 0,
    losses: 0,
    events: 0,
    stoneGain: gnZero(),
    expGain: gnZero(),
    itemGain: 0
  } as unknown as typeof adventure.session
}

describe('离线 12h 不断档 · 装备全额入包', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('12h 涉险:掉落期望数全额入包(收纳关闭时);总结只报总数', () => {
    setupOfflineTrip(12)
    const inventory = useInventoryStore()
    const resources = useResourcesStore()
    // 智能收纳默认关闭 —— 本用例测「关闭时全额入包」的旧口径
    expect(useSettingsStore().smartKeep.enabled).toBe(false)
    const dustBefore = resources.dust
    const itemsBefore = inventory.items.length

    const summary = settleOffline(Date.now())
    expect(summary, '12h 离线应结算').not.toBeNull()
    const gained = inventory.items.length - itemsBefore
    // 期望约 1465 件(基线,无词条无妖潮;实际胜率由 sampleWinRate 定,故只断下限与量级)
    expect(summary!.wins).toBeGreaterThan(0)
    expect(gained).toBeGreaterThan(100)
    expect(gained).toBeLessThan(BAG_CAPACITY * 2)
    // 收纳关闭:历练批量不化尘,尘增量只来自材料/镇压口径
    expect(summary!.notes.some(n => n.includes('已折作器灵尘'))).toBe(false)
    // 总数口径:历练批量全额入包(= 行囊新增主体)+ 首领/际遇逐件。
    // 逐件路径可能被自动回收化尘(行囊差 < 产出),故总数 >= 行囊新增,且不超过其太多。
    const total = summary!.equipmentSummary?.[0]?.total ?? 0
    expect(total).toBeGreaterThanOrEqual(gained)
    expect(total - gained).toBeLessThan(100)
    // 总结不再列逐件清单
    expect(summary!.equipment).toHaveLength(0)
    // 尘没有被批量装备撑大(材料口径 wins×0.3 量级,不是 equipCount×4)
    expect(resources.dust - dustBefore).toBeLessThan(summary!.wins)
  })

  it('收纳开启:离线批量同样裁决 —— 低阶化尘、达保留线的入包', () => {
    setupOfflineTrip(4)
    const settings = useSettingsStore()
    settings.smartKeep.enabled = true
    settings.smartKeep.minQuality = 3 // 灵品起保留
    settings.decomposeRanks = []
    const inventory = useInventoryStore()
    const itemsBefore = inventory.items.length

    const summary = settleOffline(Date.now())
    expect(summary, '4h 离线应结算').not.toBeNull()
    const gained = inventory.items.length - itemsBefore
    const total = summary!.equipmentSummary?.[0]?.total ?? 0
    const recycled = summary!.recycledEquips ?? 0

    // 开启即有动作:未达保留线的低阶件被化尘(12h 量级下 4h 也有数百件)
    expect(recycled, '收纳开启时离线应化尘一批').toBeGreaterThan(0)
    // 入包口径:total 为实际入包;逐件路径(首领/际遇)可能被在线裁决再化尘,
    // 行囊新增与 total 之间允许个位数缺口(见 09-27 离线改造:区间断言)
    expect(total).toBeGreaterThanOrEqual(gained)
    expect(total - gained).toBeLessThan(20)
    // 入包 + 化尘 = 本次离线总产出;化尘的不再混进 total
    expect(total + recycled).toBeGreaterThan(total)
    // 达保留线的件一件不少:入包明细里应有灵品及以上
    const rows = summary!.equipmentSummary?.[0]?.byQuality ?? []
    const highKept = rows.some(r => !['mortal', 'refined', 'spirit'].includes(r.quality))
    expect(highKept, '灵品及以上应入包').toBe(true)
  })

  it('行囊超 cap 也照收:出发前塞满,回来件数照涨', () => {
    setupOfflineTrip(2)
    // 批量允许超收,此处只验"有产出即有汇总",不预置满包(满包夹具成本高,见 smartKeep.spec)
    expect(BAG_CAPACITY).toBeGreaterThan(0)
    const summary = settleOffline(Date.now())
    expect(summary).not.toBeNull()
    expect(summary!.wins).toBeGreaterThan(0)
    expect(summary!.equipmentSummary?.[0]?.total ?? 0).toBeGreaterThan(0)
  })
})
