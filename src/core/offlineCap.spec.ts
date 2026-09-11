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
import { todayWeather } from './weather'
import { gn, mulN, toNum } from '@/utils/gnum'
import { OFFLINE_EFFICIENCY } from '@/data/constants'

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

describe('离线结算同源吃天时(ISS-027 续)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('灵雨日离线修炼速率高于清和日(天时并入 cultPerSec,离线不再掉加成)', () => {
    // 找一个清和日(无修炼加成)与灵雨日(+10%),同一角色同一时长下对比
    const game = useGameStore()
    let lingyuDay = -1
    let qingheDay = -1
    for (let d = 0; d < 60; d += 1) {
      game.$patch({ totalPlaySec: d * 86400 })
      const id = todayWeather().id
      if (id === 'lingyu' && lingyuDay < 0) lingyuDay = d
      if (id === 'qinghe') qingheDay = d
    }
    expect(lingyuDay).toBeGreaterThanOrEqual(0)
    expect(qingheDay).toBeGreaterThanOrEqual(0)

    function offlineExpOnDay(day: number): number {
      const g = useGameStore()
      const p = usePlayerStore()
      g.markStarted()
      // 短离线(10s)只修一次修炼,修为远未触及 expReq 封顶,差值才可比
      g.lastActiveAt = Date.now() - 10 * 1000
      g.$patch({ totalPlaySec: day * 86400 })
      p.initCharacter('离修', { roots: [] } as never)
      const before = toNum(p.exp)
      settleOffline(Date.now())
      return toNum(p.exp) - before
    }
    const expLingyu = offlineExpOnDay(lingyuDay)
    const expQinghe = offlineExpOnDay(qingheDay)
    // 灵雨修炼 +10%:离线修为增益应显著高于无加成日(留余量,防修复方 double-count)
    expect(expLingyu).toBeGreaterThan(expQinghe * 1.05)
  })

  /**
   * 扩界冒烟:离线结算此前只在元婴期(major 3)验过。
   * 高界的修为/灵气量级跨了十几个数量级,若某处仍按旧口径算,离线一结算就现形。
   */
  it('混沌道祖离线结算不崩:修为有增、数值有限', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    game.markStarted()
    game.lastActiveAt = Date.now() - GAP_HOURS * 3600 * 1000
    player.major = 20
    player.sub = 9

    const before = toNum(player.exp)
    const summary = settleOffline(Date.now())

    expect(summary, '高界离线应产出总结').not.toBeNull()
    expect(toNum(player.exp), '高界离线修为未增长').toBeGreaterThan(before)
    expect(Number.isFinite(toNum(player.exp))).toBe(true)
  })

  /**
   * 高界离线的**全产线**体检:修为、灵气、洞府、镇压、藏经阁都在同一次结算里跑。
   * 只验修为是不够的 —— 镇压产出按 capSec 结算、洞府产出按 effSec,两处量级不同,
   * 谁在高界算出负数/NaN,总结里会直接现形。
   */
  it('混沌道祖离线:五条产线的读数全部有限且非负', () => {
    const game = useGameStore()
    const player = usePlayerStore()
    game.markStarted()
    game.lastActiveAt = Date.now() - GAP_HOURS * 3600 * 1000
    player.major = 20
    player.sub = 9
    // 开一条镇压线(混沌海地界),让镇压产出也进这次结算
    player.suppressRegion('hongmengbenyuan')
    player.suppressQualified.push('hongmengbenyuan')

    const summary = settleOffline(Date.now())!
    expect(summary).not.toBeNull()
    const numeric: Record<string, number> = {
      exp: toNum(summary.exp),
      stone: toNum(summary.stone),
      herb: summary.herb,
      ore: summary.ore,
      wudao: summary.wudao
    }
    for (const [k, v] of Object.entries(numeric)) {
      expect(Number.isFinite(v), `${k} 非有限值`).toBe(true)
      expect(v, `${k} 为负`).toBeGreaterThanOrEqual(0)
    }
    for (const line of summary.notes) expect(line).not.toContain('NaN')
    for (const e of summary.equipment) expect(e.name).not.toContain('NaN')
  })

  /**
   * 离线折扣的**口径一致性**:离线修为 = 在线速率 × 时长 × OFFLINE_EFFICIENCY。
   * 单看「有没有增长」看不出量级走样 —— 高界数值跨十几个数量级,
   * 某处若被 clamp 或精度丢失,增长率就会悄悄偏离这个折扣。
   */
  it('离线折扣全程一致:人间/真仙/神人/混沌的增益都恰是 在线速率 ×0.9', () => {
    for (const major of [0, 9, 14, 20]) {
      setActivePinia(createPinia())
      const game = useGameStore()
      const player = usePlayerStore()
      game.markStarted()
      player.major = major
      player.sub = 0
      const gapHours = 4 // 低于最低封顶(8h),故 capSec = 真实时长
      game.lastActiveAt = Date.now() - gapHours * 3600 * 1000
      const rate = player.cultPerSec
      const effSec = gapHours * 3600 * OFFLINE_EFFICIENCY
      const before = toNum(player.exp)
      expect(settleOffline(Date.now()), `major ${major} 离线未结算`).not.toBeNull()
      const gained = toNum(player.exp) - before
      const expected = toNum(mulN(gn(rate), effSec))
      expect(expected, `major ${major} 期望增益为 0,断言形同虚设`).toBeGreaterThan(0)
      expect(gained / expected, `major ${major} 离线增益偏离 0.9 折扣:${(gained / expected).toFixed(4)}`).toBeCloseTo(1, 3)
    }
  })
})
