/**
 * 离线结算封顶一致性 —— 镇压区域被动收益受洞府离线上限约束。
 *
 * 回归点:离线结算此前把完整 dtSec 传给 settleSuppressedRegions(见 offline.ts),
 * 镇压收益绕过 mansion 离线封顶 —— 60h 缺席、洞府 0 级(cap 8h)时仍按 60h 全额
 * 结算(且装备 0.4/h × 60h 洪水)。修后按 capSec 结算。
 *
 * 注意:改做断言的是离线总结中「镇压诸域仍有余韵」一行的灵石数,而非 spiritStone
 * 总额——总额还含 track('offlineClaims') 触发的成就奖励(境界成就等),与镇压无关。
 * 每个 `it` 独立 pinia,避免多次结算互相污染。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { settleOffline } from './offline'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useUiStore } from '@/stores/ui'

const GAP_HOURS = 60

/** 解析 formatGN 输出(1,411 / 1.5万 / 1.2亿)为数值 */
function parseGNFmt(s: string): number {
  const m = /([\d.,]+)\s*(万|亿|兆|京)?/.exec(s)
  const base = parseFloat(m![1]!.replace(/,/g, ''))
  const mult = m![2] === '万' ? 1e4 : m![2] === '亿' ? 1e8 : m![2] === '兆' ? 1e12 : m![2] === '京' ? 1e16 : 1
  return base * mult
}

function suppressionStoneAfterOffline(mansionLevel: number): number {
  const game = useGameStore()
  const player = usePlayerStore()
  const dongfu = useDongfuStore()
  game.markStarted()
  game.lastActiveAt = Date.now() - GAP_HOURS * 3600 * 1000 // 60h 前最后在线
  player.major = 3
  player.suppressedRegions = ['qingyun']
  dongfu.setLevel('mansion', mansionLevel)
  settleOffline(Date.now())
  const line = useUiStore().offlineSummary?.notes.find(n => n.startsWith('镇压诸域仍有余韵'))
  expect(line, '镇压区域离线应有镇压提示').toBeDefined()
  const m = /灵石 \+([\d.,]+\s*万?亿?兆?京?)/.exec(line!)
  expect(m, '镇压提示应含灵石数').not.toBeNull()
  return parseGNFmt(m![1]!)
}

describe('离线结算封顶一致性', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('洞府 0 级(cap 8h):60h 缺席的镇压收益按 8h 结算,而非 60h', () => {
    const stone = suppressionStoneAfterOffline(0)
    // 8h 封顶:stoneByTier(tier1, 150×8×0.98) = 1411;60h 全额为 10584
    expect(stone).toBeGreaterThan(1000)
    expect(stone).toBeLessThan(2000)
  })

  it('洞府 4 级(cap 72h → capSec 60h):镇压收益随封顶抬升到 60h 量级', () => {
    const stone = suppressionStoneAfterOffline(4)
    // 60h 封顶:stoneByTier(tier1, 150×60×0.98) ≈ 10584
    expect(stone).toBeGreaterThan(8000)
    expect(stone).toBeLessThan(13000)
  })
})
