/* eslint-disable no-console -- 逐境内容矩阵是给人看的报告 */
/**
 * 内容密度审计 —— 「每个境界都得有新东西可学、可去、可打」
 *
 * 由扩界引出的问题(ISS-038):21 个境界里有 12 个是新加的,内容若只补到"结构齐备"
 * (每境有地界与敌人),后段仍会退化成纯数值台阶 —— 玩家在同一个境界里除了数字
 * 变大,没有新东西可选。
 *
 * 这条判据很朴素:**每个境界至少有一条门槛恰好落在该境的功法**。
 * 功法是这套游戏里最直接的"打法新增",参悟池又按 minRealm ≤ 当前+1 过滤,
 * 故只要表里有,玩家在那个境界就一定撞得见;表里没有,那个境界就只剩数字。
 *
 * 现状(加内容前的实测):渡劫(8)、太乙(12)、大罗(13)、神将(15)四境一条都没有。
 * 故障注入配方:把任一条功法的 minRealm 挪走(例如 m_daluo 13 → 12),
 * 对应境界立刻变红;把地界全挪到别的境界,「地界」那条变红。
 *
 * 本表也如实打印各界域的内容条数 —— 其中神界/混沌海的秘境为 0 **是设计**:
 * 秘境明确只做凡境(元婴·灵石)与天界(真仙·道源)两阶,不是漏做。
 */
import { describe, expect, it } from 'vitest'
import { MAX_MAJOR, REALMS, WORLDS, worldOf } from '@/data/realms'
import { REGIONS } from '@/data/regions'
import { ENEMIES } from '@/data/enemies'
import { GONGFA } from '@/data/gongfa'
import { PILLS } from '@/data/pills'
import { pillFamily, pillGainSecAt } from '@/core/pillValue'
import { EQUIPMENT_TEMPLATES } from '@/data/equipment'
import { ARTIFACTS, ARTIFACT_MAX_SLOTS } from '@/data/artifacts'
import { SECRET_REALMS } from '@/data/secretRealms'
import { WORLD_WEATHERS } from '@/core/weather'

/** 某境界的地界所占的层级 */
function tiersOf(major: number): Set<number> {
  return new Set(REGIONS.filter(r => r.minRealm === major).map(r => r.tier))
}

describe('内容密度 · 每一境都得有新东西', () => {
  it('逐境内容矩阵(读表,不手抄)', () => {
    const head = ['境界', '地界', '敌人', '新功法', '新丹方']
    console.log(head.join('\t'))
    for (let m = 0; m <= MAX_MAJOR; m++) {
      const regions = REGIONS.filter(r => r.minRealm === m)
      const tiers = tiersOf(m)
      console.log(
        [
          `${m} ${REALMS[m]!.name}`,
          regions.length,
          ENEMIES.filter(e => tiers.has(e.tier)).length,
          GONGFA.filter(g => g.minRealm === m).length,
          PILLS.filter(p => p.minRealm === m).length
        ].join('\t')
      )
    }
  })

  it('每一境都至少有一条门槛落在该境的功法 —— 境界不能只是数值台阶', () => {
    const empty: string[] = []
    for (let m = 0; m <= MAX_MAJOR; m++) {
      if (!GONGFA.some(g => g.minRealm === m)) empty.push(`${m} ${REALMS[m]!.name}`)
    }
    expect(empty, `这些境界没有任何新功法可参悟:${empty.join('、')}`).toEqual([])
  })

  it('每一境也都有自己的丹 —— 与「每境都有新功法」同一条理由', () => {
    // 丹药是消费侧的新鲜感:到了这一境,炉子里/掉落里该有一样是这一境才有的。
    // 此前神王(16)、混沌神魔(19)、混沌道祖(20)三境一味本境丹都没有。
    const empty: string[] = []
    for (let m = 0; m <= MAX_MAJOR; m++) {
      if (!PILLS.some(p => p.minRealm === m)) empty.push(`${m} ${REALMS[m]!.name}`)
    }
    expect(empty, `这些境界没有任何本境丹药:${empty.join('、')}`).toEqual([])
  })

  it('丹方越晚越强:同族同线里,门槛更高的那一味药力不更低', () => {
    // 法则 B 只比品质高低;同品质的几味之间若后面的反而更弱,玩家会看到
    // 「我到了更高境界,拿到的丹还不如从前」——故这里再按门槛比一遍。
    const TIMED = ['exp', 'qi', 'lifespan', 'wudao', 'tempo'] as const
    for (const fam of TIMED) {
      for (const line of ['craft', 'drop'] as const) {
        const group = PILLS.filter(p => pillFamily(p) === fam && (p.recipe ? 'craft' : 'drop') === line).sort(
          (a, b) => a.minRealm - b.minRealm
        )
        for (let i = 1; i < group.length; i++) {
          const prev = group[i - 1]!
          const cur = group[i]!
          // 统一到两者的较高门槛折算,免得比出的是境界差
          const at = Math.max(prev.minRealm, cur.minRealm)
          expect(
            pillGainSecAt(cur, at),
            `${cur.name}(境${cur.minRealm})比更早的 ${prev.name}(境${prev.minRealm})还弱`
          ).toBeGreaterThanOrEqual(pillGainSecAt(prev, at) - 1e-9)
        }
      }
    }
  })

  it('每一境都有地界可去,且地界里有人可打', () => {
    for (let m = 0; m <= MAX_MAJOR; m++) {
      const regions = REGIONS.filter(r => r.minRealm === m)
      expect(regions.length, `${REALMS[m]!.name} 无地界可去`).toBeGreaterThanOrEqual(1)
      const tiers = tiersOf(m)
      expect(ENEMIES.filter(e => tiers.has(e.tier)).length, `${REALMS[m]!.name} 的地界里没有敌人`).toBeGreaterThanOrEqual(1)
    }
  })

  it('每一界域都有自己的天时(人间界固定池,其余按界域分池)', () => {
    for (const w of WORLDS) {
      const pool = w.id === 'mortal' ? 6 : (WORLD_WEATHERS[w.id as 'immortal' | 'god' | 'chaos']?.length ?? 0)
      expect(pool, `${w.name} 没有专属天时`).toBeGreaterThanOrEqual(1)
    }
  })

  it('各界域的内容条数(装备/法宝/秘境/天时)—— 秘境只有两阶是设计,不是漏做', () => {
    const tierWorld = new Map<number, string>()
    for (const r of REGIONS) tierWorld.set(r.tier, worldOf(r.minRealm).id)
    const rows = WORLDS.map(w => {
      const inWorld = <T,>(xs: T[], pick: (x: T) => number): number => xs.filter(x => tierWorld.get(pick(x)) === w.id).length
      return {
        world: w.name,
        装备模板: inWorld(EQUIPMENT_TEMPLATES, t => t.minTier),
        法宝: inWorld(ARTIFACTS, a => a.minTier),
        秘境: SECRET_REALMS.filter(s => (s.gate === 'celestial' ? 'immortal' : 'mortal') === w.id).length
      }
    })
    console.log('界域\t装备模板\t法宝\t秘境(仅两阶)')
    for (const r of rows) console.log(`${r.world}\t${r.装备模板}\t${r.法宝}\t${r.秘境}`)
    // 每个界域都该有该界的装备与法宝(秘境是明确的两阶内容,不在此列)
    for (const r of rows) {
      expect(r.装备模板, `${r.world} 没有专属装备模板`).toBeGreaterThan(0)
      expect(r.法宝, `${r.world} 没有专属法宝`).toBeGreaterThan(0)
    }
  })

  it('高界的法宝也成取舍:一个界域的法宝件数要多于可装备的槽位数', () => {
    // 法宝位只有 ARTIFACT_MAX_SLOTS 个;若一个界域正好只给这么多件,
    // 玩家就把它们全带上,「选哪件」这个问题根本不会出现 —— 内容量够,选择才存在。
    const tierWorld = new Map<number, string>()
    for (const r of REGIONS) tierWorld.set(r.tier, worldOf(r.minRealm).id)
    for (const w of WORLDS) {
      const n = ARTIFACTS.filter(a => tierWorld.get(a.minTier) === w.id).length
      expect(n, `${w.name} 有 ${n} 件法宝、${ARTIFACT_MAX_SLOTS} 个法宝位 —— 带满即最优,没有取舍`).toBeGreaterThan(
        ARTIFACT_MAX_SLOTS
      )
    }
  })
})
