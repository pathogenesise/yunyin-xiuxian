/* eslint-disable no-console -- 模拟器体检报告的正式输出(bun run test:report 依赖) */
import { describe, expect, it } from 'vitest'
import { REALMS, WORLD_BREAK_MAJOR, MAX_MAJOR } from '@/data/realms'
import {
  BUILDING_CULT_CAP,
  DEFAULT_ASSUMPTIONS,
  cultMultParts,
  firstLifeMilestones,
  hoursToReach,
  multiLifeTable,
  secondsForMajor
} from './progressionSim'
import { expRequirement, qiCap } from './formulas'
import { toNum } from '@/utils/gnum'
import { GONGFA } from '@/data/gongfa'
import { gongfaModsAt } from '@/stores/cultivation'
import { GONGFA_BRANCHES } from '@/data/gongfaBranches'
import { BUILDINGS } from '@/data/buildings'
import { AFFIXES } from '@/data/affixes'

const fmt = (h: number): string => (h < 1 ? `${(h * 60).toFixed(1)}分` : h < 48 ? `${h.toFixed(1)}时` : `${(h / 24).toFixed(1)}天`)

describe('数值曲线审计(Phase 14)', () => {
  it('第一世里程碑落在目标区间内', () => {
    const rows = firstLifeMilestones()
    // 输出审计表
    console.log('\n—— 第一世抵达各大境界(在线等效,真实约 ×1.5~3) ——')
    for (const r of rows) {
      console.log(`  ${REALMS[r.major]!.name.padEnd(4, ' ')} ${fmt(r.hours)}`)
    }
    const h = (m: number): number => rows.find(r => r.major === m)!.hours
    expect(h(1)).toBeGreaterThan(0.03) // 筑基不至于秒到
    expect(h(1)).toBeLessThan(1.5) // 首日内可筑基
    expect(h(2)).toBeLessThan(12) // 金丹一两日
    expect(h(3)).toBeLessThan(48) // 元婴首周内
    expect(h(9)).toBeGreaterThan(300) // 真仙不可速通(>12天)
    expect(h(9)).toBeLessThan(3500) // 也不至于遥遥无期(<146天)
  })

  it('每个大境界耗时增幅在 2~6 倍之间(平滑放置曲线)', () => {
    for (let m = 1; m <= 8; m += 1) {
      const ratio = secondsForMajor(m, 0) / secondsForMajor(m - 1, 0)
      expect(ratio).toBeGreaterThan(2)
      expect(ratio).toBeLessThan(6)
    }
  })

  /**
   * 界外节奏(仙界/神界/混沌海):0-9 号境界沿用旧曲线,不在此约束内。
   * 跨界后改用 LATE_* 平坦曲线,这里守住两件事:
   *   1. 每个新大境界仍比上一境更慢(是攀登,不是白送),但增幅被压到 2 倍以内
   *   2. 整条界外长尾有界——不至于让最后一个境界成为数学上不可达
   */
  it('界外每境耗时增幅收敛在 (1, 2) 之间', () => {
    for (let m = WORLD_BREAK_MAJOR + 1; m <= MAX_MAJOR; m += 1) {
      const ratio = secondsForMajor(m, 0) / secondsForMajor(m - 1, 0)
      expect(ratio, `${REALMS[m]!.name} 相对 ${REALMS[m - 1]!.name} 的耗时增幅`).toBeGreaterThan(1)
      expect(ratio).toBeLessThan(2)
    }
  })

  it('界外长尾有界:修满混沌道祖的耗时不到修满真仙的 100 倍', () => {
    const toZhenxian = hoursToReach(WORLD_BREAK_MAJOR, 0)
    const toPeak = hoursToReach(MAX_MAJOR, 0)
    console.log(
      `\n界外长尾:至真仙 ${fmt(toZhenxian)} → 至${REALMS[MAX_MAJOR]!.name} ${fmt(toPeak)}` +
        `(×${(toPeak / toZhenxian).toFixed(1)})`
    )
    expect(toPeak / toZhenxian).toBeGreaterThan(2) // 四界确实是长线,不是几步就到
    expect(toPeak / toZhenxian).toBeLessThan(100) // 但有界,不至于数学上不可达
  })

  /**
   * 「指数级」不能只是口头承诺。界外每一境,修为需求与灵气容量的环比都必须 ≥3 倍 ——
   * 这是实打实的复利;而净耗时只按 ~1.25 倍增长(见上一条),两者分工明确:
   * 数值按指数堆叠,阶梯仍可达。
   */
  it('界外需求与灵气都是指数复利(每境环比 ≥3 倍)', () => {
    for (let m = WORLD_BREAK_MAJOR + 1; m <= MAX_MAJOR; m += 1) {
      const expRatio = toNum(expRequirement(m, 0)) / toNum(expRequirement(m - 1, 0))
      const qiRatio = qiCap(m, 0) / qiCap(m - 1, 0)
      expect(expRatio, `${REALMS[m]!.name} 修为需求不是指数复利(环比 ${expRatio.toFixed(2)})`).toBeGreaterThan(3)
      expect(qiRatio, `${REALMS[m]!.name} 灵气容量不是指数复利(环比 ${qiRatio.toFixed(2)})`).toBeGreaterThan(3)
    }
  })

  it('多周目:转世加速但绝非无限加速器', () => {
    const table = multiLifeTable([1, 2, 3, 5, 10, 20])
    console.log('\n—— 多周目对照(每世修至元婴后转世) ——')
    console.log('  世数 | 道果 | 至筑基 | 至金丹 | 至元婴')
    for (const r of table) {
      console.log(
        `  第${String(r.life).padStart(2, ' ')}世 | ${String(r.daoFruit).padStart(4, ' ')} | ${fmt(r.toZhuji).padStart(7, ' ')} | ${fmt(r.toJindan).padStart(7, ' ')} | ${fmt(r.toYuanying).padStart(7, ' ')}`
      )
    }
    const l1 = table[0]!
    const l2 = table[1]!
    const l20 = table[5]!
    // 第二世应更快,但保留至少两成耗时
    expect(l2.toZhuji / l1.toZhuji).toBeGreaterThan(0.2)
    expect(l2.toZhuji / l1.toZhuji).toBeLessThan(0.9)
    // 第二十世依旧不能瞬间到元婴(软上限生效)
    expect(l20.toYuanying).toBeGreaterThan(0.15)
    // 单调递减
    for (let i = 1; i < table.length; i += 1) {
      expect(table[i]!.toYuanying).toBeLessThan(table[i - 1]!.toYuanying)
    }
  })

  it('道果软上限:20 世加速倍率被控制在 10 倍以内', () => {
    const table = multiLifeTable([1, 20])
    const accel = table[0]!.toYuanying / table[1]!.toYuanying
    expect(accel).toBeGreaterThan(2) // 多周目要有获得感
    expect(accel).toBeLessThan(10) // 但不是无限加速器
  })

  it('百世压测:加速持续放缓,不存在隐性指数膨胀(Phase 19)', () => {
    const table = multiLifeTable([1, 20, 50, 100])
    const base = table[0]!.toYuanying
    console.log('\n—— 百世加速压测(至元婴耗时相对第一世) ——')
    for (const row of table) {
      console.log(
        `  第${String(row.life).padStart(3, ' ')}世 | 道果 ${String(row.daoFruit).padStart(4, ' ')} | ×${(base / row.toYuanying).toFixed(1)} 加速`
      )
    }
    const accel20 = base / table[1]!.toYuanying
    const accel50 = base / table[2]!.toYuanying
    const accel100 = base / table[3]!.toYuanying
    // 百世加速有上界(软上限有效)
    expect(accel100).toBeLessThan(25)
    expect(accel100).toBeGreaterThan(accel50)
    // 边际递减:50→100 世的增益小于 20→50 世
    expect(accel100 / accel50).toBeLessThan(accel50 / accel20)
    // 第 100 世到元婴依旧不能是瞬间(> 3 分钟)
    expect(table[3]!.toYuanying).toBeGreaterThan(0.05)
  })
})

/**
 * 模型假设 · 每一分都得真实凑得出
 *
 * 模拟器给的是「节奏基准」,故它假设的 kit 不能是玩家拼不出来的东西 ——
 * 否则它算出的耗时是纸上数字,拿它当设计基准就会一路偏下去。
 *
 * 这件事是在核对时真发现的:模型把洞府建筑按 Math.min(1.2, 0.1+0.09m) 估,
 * 而建筑表满级合计只有 76%(洞府 4 级 ×4% + 聚灵阵 20 级 ×3%)—— 高界凭空多了
 * 44 个百分点。方向与「真实约为估算的 1.5~3 倍」一致,所以一直没被看出来。
 *
 * 故障注入:把 estimateCultMult 里那一项改回写死的 1.2,本条立刻红。
 */
describe('模型假设 · 每一分都得真实凑得出', () => {
  /** 某功法满级时的修炼速度加成 */
  const cultOf = (id: string): number => {
    const def = GONGFA.find(g => g.id === id)!
    return gongfaModsAt(id, def.maxLevel).cultivationSpeed ?? 0
  }
  /** 满级 + 选一条最利于修速的悟道分支(分支各功法只能选一条) */
  const cultWithBranch = (id: string): number => {
    const branches = GONGFA_BRANCHES.filter(b => b.gongfaId === id).map(b => b.mods.cultivationSpeed ?? 0)
    return cultOf(id) + Math.max(0, ...branches)
  }

  it('模型拆出来的每一项,都不超过真实内容能给的上限', () => {
    // 建筑满级合计(洞府 4×4% + 聚灵阵 20×3%)与藏经阁(辅修槽位依据)
    expect(BUILDING_CULT_CAP).toBeCloseTo(0.76, 6)
    const libraryMax = BUILDINGS.find(b => b.id === 'library')?.maxLevel ?? 20
    const subSlotCap = 1 + Math.floor(libraryMax / 3)
    const bestAffix = Math.max(...AFFIXES.filter(a => a.key === 'cultivationSpeed').map(a => a.max)) / 100

    for (let m = WORLD_BREAK_MAJOR; m <= MAX_MAJOR; m++) {
      const parts = cultMultParts(m, 0)
      const part = (name: string): number => parts.find(p => p.name === name)?.value ?? 0
      const usable = GONGFA.filter(g => g.minRealm <= m)
      const bestMain = Math.max(0, ...usable.filter(g => g.type === 'main').map(g => cultWithBranch(g.id)))
      const bestSubs = usable
        .filter(g => g.type !== 'main')
        .map(g => cultWithBranch(g.id))
        .sort((a, b) => b - a)
        .slice(0, subSlotCap)
        .reduce((s, v) => s + v, 0)

      expect(part('洞府'), `境界 ${m}:模型假设洞府给 ${part('洞府').toFixed(2)},建筑表满级只有 ${BUILDING_CULT_CAP}`)
        .toBeLessThanOrEqual(BUILDING_CULT_CAP + 1e-9)
      expect(part('功法') + part('辅修'), `境界 ${m}:模型假设功法+辅修给 ${(part('功法') + part('辅修')).toFixed(2)},真实最多凑 ${(bestMain + bestSubs).toFixed(2)}`)
        .toBeLessThanOrEqual(bestMain + bestSubs + 1e-9)
      expect(part('装备'), `境界 ${m}:模型假设装备给 ${part('装备').toFixed(2)},六部位各一条顶级修速词条只有 ${(6 * bestAffix).toFixed(2)}`)
        .toBeLessThanOrEqual(6 * bestAffix + 1e-9)
      // 灵根那一项是「典型值」而非顶配:生成器的顶配远高于它
      expect(part('灵根'), '典型灵根不该按顶配算').toBeLessThan(3)
    }
  })

  it('功法与辅修那一项不超过该境可凑出的功法合计(模型还漏算了秘术与分支,只会更保守)', () => {
    const subSlotCap = 1 + Math.floor((BUILDINGS.find(b => b.id === 'library')?.maxLevel ?? 20) / 3)
    for (let m = WORLD_BREAK_MAJOR; m <= MAX_MAJOR; m++) {
      const usable = GONGFA.filter(g => g.minRealm <= m)
      const bestMain = Math.max(0, ...usable.filter(g => g.type === 'main').map(g => cultWithBranch(g.id)))
      // 辅修栏不挑类型(秘术也能占,见 cultivation.toggleSub),故候选是「除主修之外的全部」
      const bestSubs = usable
        .filter(g => g.type !== 'main')
        .map(g => cultWithBranch(g.id))
        .sort((a, b) => b - a)
        .slice(0, subSlotCap)
        .reduce((s, v) => s + v, 0)
      const assumed = 0.12 + 0.055 * m + (0.06 + 0.05 * m)
      expect(assumed, `境界 ${m}:模型假设功法给 ${assumed.toFixed(2)},真实最多凑 ${(bestMain + bestSubs).toFixed(2)}`)
        .toBeLessThanOrEqual(bestMain + bestSubs + 1e-9)
    }
  })

  it('装备那一项不超过六个部位各出一条修速词条能给的量', () => {
    const bestAffix = Math.max(...AFFIXES.filter(a => a.key === 'cultivationSpeed').map(a => a.max)) / 100
    expect(bestAffix, '词条表里没有修炼速度词条,这项假设无从校准').toBeGreaterThan(0)
    const assumed = 0.05 + 0.03 * MAX_MAJOR
    expect(assumed, `模型假设装备给 ${assumed.toFixed(2)},六部位各一条顶级修速词条只有 ${(6 * bestAffix).toFixed(2)}`)
      .toBeLessThanOrEqual(6 * bestAffix + 1e-9)
  })

  it('灵根那一项取的是典型值而非顶配 —— 顶配远高于它', () => {
    expect(DEFAULT_ASSUMPTIONS.linggenMult).toBeGreaterThan(1)
    expect(DEFAULT_ASSUMPTIONS.linggenMult, '典型灵根不该按顶配算').toBeLessThan(3)
  })
})
