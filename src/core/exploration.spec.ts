/**
 * 历练 —— 战斗与中断路径
 *
 * 聚焦 Phase 31.0 S4 灵兽性格的「败北保护」:
 * 慢稳/谨慎的灵兽带 lossReduction(降低失败率),败北时低概率护住玩家,
 * 免于重伤、不计败绩、历练继续。此前 lossReduction 只在 petPersonality 里
 * 定义了数值,从未接入 runBattle —— 描述即承诺,不生效就是欺骗。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAdventureStore } from '@/stores/adventure'
import { useCultivationStore } from '@/stores/cultivation'
import { gnZero } from '@/utils/gnum'
import { tickExploration, startExploration } from './exploration'
import { startRetreat } from './earlyGameService'

/**
 * 与 petPersonality.EFFECTS 里的 cautious 值保持一致(见 petPersonality.spec)。
 * 假 rng 用这个精确值来识别「败北保护那一掷」,测试不依赖调用顺序:
 * 只有 lossReduction 这一掷会被放行,其余 chance 一律为否
 * (事件跳掉、邂逅不触发、残魂不显现),从而干净地走到败北分支。
 */
const CAUTIOUS_LOSS_REDUCTION = 0.04

const { protect, combatWin } = vi.hoisted(() => ({ protect: { value: false }, combatWin: { value: false } }))

vi.mock('@/utils/random', async importOriginal => {
  const mod = await importOriginal<typeof import('@/utils/random')>()
  return {
    ...mod,
    rng: {
      next: () => 0.5,
      int: (_a: number, b: number) => b,
      float: (a: number, _b: number) => a,
      pick: <T,>(arr: readonly T[]): T => arr[0]!,
      weighted: <T,>(arr: readonly T[]): T => arr[0]!,
      chance: (p: number): boolean =>
        protect.value === true && Math.abs(p - CAUTIOUS_LOSS_REDUCTION) < 1e-9
    }
  }
})

// resolveCombat 恒为可控胜负(默认败),makeEnemySnap 恒为占位敌
vi.mock('./combat', async importOriginal => {
  const mod = await importOriginal<typeof import('./combat')>()
  return {
    ...mod,
    resolveCombat: () => (combatWin.value ? { win: true, rounds: 5, playerHpPct: 0.9 } : { win: false, rounds: 5, playerHpPct: 0.4 }),
    makeEnemySnap: () => ({ hp: 100, def: 10, atk: 10 })
  }
})

function forgeSession(now: number): void {
  useAdventureStore().setSession({
    regionId: 'qingyun',
    mode: 'normal',
    startedAt: now - 5000,
    endsAt: now + 60000,
    nextBattleAt: now - 1,
    wins: 0,
    losses: 0,
    events: 0,
    stoneGain: gnZero(),
    expGain: gnZero(),
    itemGain: 0
  })
}

describe('灵兽性格 · 败北保护(lossReduction 接入 runBattle)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    protect.value = false
    combatWin.value = false
  })

  it('谨慎灵兽败北时护住:不加重伤、不计败绩、历练继续', () => {
    const player = usePlayerStore()
    player.initCharacter('护主', { roots: [] } as never)
    player.setPet('pet_yueying') // cautious → lossReduction 0.04
    const now = Date.now()
    forgeSession(now)

    protect.value = true // 放行败北保护那一掷

    tickExploration(now)

    const cultivation = useCultivationStore()
    const adventure = useAdventureStore()
    expect(cultivation.buffs.some(b => b.defId === 'injury')).toBe(false)
    expect(adventure.session).not.toBeNull()
    expect(adventure.session?.losses).toBe(0)
  })

  it('无灵兽败北照常:受重伤、计败绩、中止历练', () => {
    const player = usePlayerStore()
    player.initCharacter('无护', { roots: [] } as never)
    const now = Date.now()
    forgeSession(now)

    tickExploration(now)

    const cultivation = useCultivationStore()
    const adventure = useAdventureStore()
    expect(cultivation.buffs.some(b => b.defId === 'injury')).toBe(true)
    expect(adventure.session).toBeNull() // stopExploration('defeat') 已清空
    expect(adventure.lastBattle?.result.win).toBe(false)
  })

  it('好战灵兽(lossReduction=0)败北不护:与无灵兽一致', () => {
    const player = usePlayerStore()
    player.initCharacter('莽打', { roots: [] } as never)
    player.setPet('pet_huoque') // fierce → lossReduction 0
    const now = Date.now()
    forgeSession(now)

    protect.value = true // 即使放行掷点,0 的概率也恒不护

    tickExploration(now)

    const cultivation = useCultivationStore()
    const adventure = useAdventureStore()
    expect(cultivation.buffs.some(b => b.defId === 'injury')).toBe(true)
    expect(adventure.session).toBeNull()
  })
})

describe('连胜(TASK-022 接线 · runBattle 胜负驱动 player.winStreak)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    protect.value = false
    combatWin.value = false
  })

  it('战场得胜让连胜 +1', () => {
    const player = usePlayerStore()
    player.initCharacter('连胜测试', { roots: [] } as never)
    const now = Date.now()
    forgeSession(now)

    combatWin.value = true
    tickExploration(now)

    expect(player.winStreak).toBe(1)
  })

  it('真正的败北重置连胜(3→0);灵兽护住的那次不重置', () => {
    const player = usePlayerStore()
    player.initCharacter('连胜测试', { roots: [] } as never)
    player.setPet('pet_yueying') // cautious → lossReduction 0.04
    player.winStreak = 3
    const now = Date.now()
    forgeSession(now)

    protect.value = true // 败北被护住:不算败 → 连胜保留
    tickExploration(now)
    expect(player.winStreak).toBe(3)
    expect(useAdventureStore().session).not.toBeNull()

    // 再来一场真正的败北(无灵兽保护):连胜清空
    player.setPet('pet_huoque') // fierce → lossReduction 0
    protect.value = false
    player.winStreak = 5
    forgeSession(now)
    tickExploration(now)
    expect(player.winStreak).toBe(0)
  })
})

/**
 * 镇压资格只在**首次**达成时自动接管(DEC-018):
 * 若每次优势取胜都自动转成收益态,玩家就没法自由选择「这一世我要历练它」。
 */
describe('镇压资格首次自动、此后自由', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    protect.value = false
    combatWin.value = true
  })

  it('首次达成条件 → 自动转收益并记下资格;停取后再胜,不再自动接管', () => {
    const player = usePlayerStore()
    player.initCharacter('镇守', { roots: [] } as never)
    // 已达镇压条件的一地
    const stats = { totalFights: 30, avgRounds: 2, avgDamageTakenPct: 0.03, consecutiveWins: 30, lastUpdateAt: Date.now() }
    player.regionStats.qingyun = { ...stats }

    const now = Date.now()
    forgeSession(now)
    tickExploration(now)
    expect(player.suppressedRegions, '首次达成应自动转收益').toContain('qingyun')
    expect(player.suppressQualified).toContain('qingyun')

    // 玩家改主意:停取收益,重新历练此地
    player.unsuppressRegion('qingyun')
    player.regionStats.qingyun = { ...stats }
    const now2 = Date.now() + 60_000
    forgeSession(now2)
    tickExploration(now2)
    expect(player.suppressedRegions, '已取得资格后不该再被自动接管').not.toContain('qingyun')
    expect(player.suppressQualified).toContain('qingyun')
  })
})

describe('闭关禁令:闭关期间不得进入历练(Phase 28 接线后)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    protect.value = false
    combatWin.value = false
  })

  it('startExploration 在闭关中被拒,不产生会话(拒绝原因显式而非静默)', () => {
    const player = usePlayerStore()
    player.initCharacter('闭关测试', { roots: [] } as never)
    startRetreat()
    expect(startExploration('qingyun', 'normal')).toBe(false)
    expect(useAdventureStore().session).toBeNull()
    expect(useCultivationStore().hasBuff('retreat')).toBe(true)
  })
})
