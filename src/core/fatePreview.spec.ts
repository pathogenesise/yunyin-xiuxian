/* eslint-disable no-console -- 天机预览是过程性验收,打印带伤前后的读数 */
/**
 * 天机道 · 预览验收
 *
 * 天机道是玩家**选了才有的**一条道途,它给的东西就是「窥见胜算」四个字。
 * 故这条判据盯的不是「预览能不能出字」,而是它**说的话算不算数**:
 *
 *   一 只有天机道才看得见(别的道途拿不到这份情报);
 *   二 胜算与实战同一个口径 —— 连**携带气血**也算进去(远征连着打,上一场剩多少血
 *      就带进下一场;预览若只看规则不看血,玩家越残它报得越乐观);
 *   三 它给的是一眼形势,不是答案:招式的危险时点该说的都要说到。
 *
 * 故障注入:把预览改回只看 expeditionRules(不压携带气血),第二条立刻红。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useEndgameStore, type WorldRunState } from '@/stores/endgame'
import { CELESTIAL_WORLDS } from '@/data/endgame'
import { useInventoryStore } from '@/stores/inventory'
import { RandomService, mulberry32 } from '@/utils/random'
import { previewFight, withCarriedHp } from './expedition'

const seeded = (seed = 5): RandomService => new RandomService(mulberry32(seed))

beforeEach(() => {
  setActivePinia(createPinia())
})

/**
 * 给这位道祖一件像样的兵器。
 *
 * 一条**恰好落在带里**的夹具:天界敌人按本界锚点定标,裸装打无相天的路线节点必败
 * (三场全负 → 0.08),再添第二件就必胜(三场全胜 → 0.93)。一件时满血 3 胜、
 * 残血 2 胜 —— 只有在这种势均偏优的局面里,「携带气血算不算进去」才量得出来。
 */
function dressOneWeapon(): void {
  const inv = useInventoryStore()
  const item = { uid: 'fx1', templateId: 'w_benyuan', quality: 'divine' as const, tier: 32, level: 5, affixes: [{ id: 'atk4', roll: 1 }, { id: 'hp4', roll: 1 }, { id: 'def4', roll: 1 }] }
  inv.items = [item] // 每次重摆,不做追加:夹具体检两次调用,追加会悄悄变成两件
  inv.equip('fx1', 'weapon')
}

/** 备好一个天机道玩家 + 一趟打到第 2 重的远征 */
function fateRun(carriedHpPct: number, worldId = 'wuxiang', major = 14): WorldRunState {
  const player = usePlayerStore()
  const endgame = useEndgameStore()
  player.major = major
  endgame.daoPath = 'fate'
  const run = {
    worldId,
    pactId: null,
    gateId: null,
    layer: 1,
    bonus: 0,
    rows: [],
    carriedHpPct,
    totalRounds: 0,
    winStacks: 0
  } as unknown as WorldRunState
  endgame.worldRun = run
  return run
}

describe('天机道 · 预览', () => {
  it('只有天机道看得见 —— 别的道途拿不到这份情报', () => {
    fateRun(1)
    const world = CELESTIAL_WORLDS.find(w => w.id === 'wuxiang')!
    const node = world.routes[1]![0]!
    expect(previewFight(node.foe, node, seeded()), '天机道应当看得见').not.toBeNull()
    useEndgameStore().daoPath = 'sword'
    expect(previewFight(node.foe, node, seeded()), '剑道不该看得见').toBeNull()
  })

  it('预览的胜算与实战同口径:残血时不许比满血更乐观', () => {
    const world = CELESTIAL_WORLDS.find(w => w.id === 'wuxiang')!
    const node = world.routes[1]![0]!

    /**
     * 这一条要在**打得起来**的局面里量。
     *
     * 天界敌人的强度按本界锚点定标(见 gauntlet.celestialAnchor):无相天是阶梯最深处,
     * 拿神人境去打它,满血与残血都是必败 —— 胜负早被境界差决定,携带气血那点差别
     * 淹没在两端饱和里,这条判据就量不出东西。故夹具摆到这一界该有的境界(混沌道祖):
     * 裸装此时的战力比约 1.5 —— 势均,才量得出气血。
     */
    fateRun(1, 'wuxiang', 20)
    dressOneWeapon()
    const full = previewFight(node.foe, node, seeded(5))!
    fateRun(0.15, 'wuxiang', 20)
    dressOneWeapon()
    const hurt = previewFight(node.foe, node, seeded(5))!

    console.log(`\n同一眼天机:满血 ${full.winText}(${full.rate.toFixed(2)}) · 带一成半气血 ${hurt.winText}(${hurt.rate.toFixed(2)})`)
    expect(
      hurt.rate,
      `带一成半气血的预览报「${hurt.winText}」,与满血「${full.winText}」一样乐观 —— 携带气血没算进去`
    ).toBeLessThan(full.rate)
  })

  it('压上携带气血的规则就是实战规则:开局气血取「世界上限」与「携带气血」的较小者', () => {
    const run = fateRun(0.4)
    // 赤炎天自带「敌方攻击 +40%」等世界规则,用作基线
    const chiyan = CELESTIAL_WORLDS.find(w => w.id === 'chiyan')!
    const base = { ...chiyan.rules }
    const capped = withCarriedHp(base, run)
    expect(capped.playerStartHpPct).toBeCloseTo(0.4, 6)
    // 满血时不该被压低
    expect(withCarriedHp(base, { ...run, carriedHpPct: 1 }).playerStartHpPct).toBeCloseTo(1, 6)
    // 世界若本来就压了开局气血(如某些契约),取更严的那个
    expect(withCarriedHp({ ...base, playerStartHpPct: 0.3 } as typeof base, run).playerStartHpPct).toBeCloseTo(0.3, 6)
  })

  it('它给的是形势,不是答案:招式的危险时点该说说', () => {
    const world = CELESTIAL_WORLDS.find(w => w.id === 'chiyan')!
    // 注意:跑的是哪一界要看 run.worldId —— 预览取的是那一界的规则(拿错界就问不出这界的天时)
    fateRun(1, 'chiyan')
    const node = world.routes[1]![0]!
    const preview = previewFight(node.foe, node, seeded())!
    expect(preview.skillLines.length, '一眼看不见对面会什么招,那算什么天机').toBeGreaterThan(0)
    // 赤炎天的世界规则里有「回合上限骤减」与「治疗 -35%」,两条都该被点出来
    expect(preview.riskLines.join(' / ')).toContain('天时仅')
    expect(preview.riskLines.join(' / ')).toContain('生机稀薄')
  })
})
