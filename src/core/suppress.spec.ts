import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useInventoryStore } from '@/stores/inventory'
import { DECOMPOSE_DUST } from '@/data/constants'
import { qualityDef } from '@/data/qualities'
import { toNum } from '@/utils/gnum'
import { checkSuppression, settleSuppressedRegions, suppressYield } from './suppress'

describe('区域镇压系统', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * 地界物产:镇压收益不再只有灵石 —— 火域出矿、林区出草、天界以上出尘。
   * 这样「镇守哪几片」才是一道取舍,而不是"挑层级最高的那几处"。
   */
  describe('地界物产(灵石之外的次级产出)', () => {
    it('按地界气质给物产:林区出草、山地出矿、混沌之滨出尘', () => {
      expect(suppressYield('wanyao')?.id).toBe('herb') // 万妖林:forest
      expect(suppressYield('qingyun')?.id).toBe('ore') // 青云山麓:mountain
      expect(suppressYield('hongmengbenyuan')?.id).toBe('dust') // 鸿蒙本源:sky
      expect(suppressYield('guzhanchang')?.id).toBe('page') // 古战场遗迹:ruin
    })

    it('层级越高,同一物产产出越丰(线性,不随灵石做指数)', () => {
      // 同为林区(灵草):黑风林 tier 3 vs 迷雾沼泽 tier 9
      const low = suppressYield('heifeng')!
      const high = suppressYield('miwu')!
      expect(low.id).toBe('herb')
      expect(high.id).toBe('herb')
      expect(high.perHour).toBeGreaterThan(low.perHour)
      // 线性口径:层级差 6,约多 6×15%
      expect(high.perHour / low.perHour).toBeLessThan(1 + 0.15 * 8)
    })

    it('结算时物产真的进了库存,并记进产出清单', () => {
      const player = usePlayerStore()
      const resources = useResourcesStore()
      player.suppressedRegions = ['wanyao']
      player.suppressedSince = { wanyao: Date.now() }
      const before = resources.herb

      const total = settleSuppressedRegions(3600) // 一小时
      expect(total).not.toBeNull()
      expect(resources.herb, '林区镇压应产出灵草').toBeGreaterThan(before)
      const row = total!.resources.find(r => r.id === 'herb')
      expect(row, '产出清单应记下灵草').toBeDefined()
      expect(row!.name).toBe('灵草')
      expect(row!.amount).toBeGreaterThan(0)
    })

    /**
     * 比率体检:镇压产出对**时长**必须是线性的(层级线性上面已有用例)。
     * 只看"有没有产出"看不出某处被 clamp 或按整点数取整 —— 六小时的产出
     * 应当恰是两小时的三倍。
     */
    it('时长线性:六小时产出恰是两小时的三倍(同一片地,不因取整走样)', () => {
      const player = usePlayerStore()
      player.suppressedRegions = ['wanyao']
      player.suppressedSince = { wanyao: Date.now() }
      const two = settleSuppressedRegions(2 * 3600)!
      const six = settleSuppressedRegions(6 * 3600)!
      const twoStone = toNum(two.stone)
      const sixStone = toNum(six.stone)
      expect(twoStone).toBeGreaterThan(0)
      expect(sixStone / twoStone, `六小时 ${sixStone} vs 两小时 ${twoStone}`).toBeCloseTo(3, 6)
      // 材料是整数取整,允许 ±1 的取整误差,但比值仍应在 3 附近
      const twoHerb = two.resources.find(r => r.id === 'herb')?.amount ?? 0
      const sixHerb = six.resources.find(r => r.id === 'herb')?.amount ?? 0
      expect(twoHerb).toBeGreaterThan(0)
      expect(sixHerb / twoHerb).toBeGreaterThan(2.5)
      expect(sixHerb / twoHerb).toBeLessThan(3.5)
    })
  })

  /**
   * 「镇压过就镇压过」(DEC-018):
   * 取得资格是**一次性**的,此后收取收益只是一个开关 —— 停取不影响资格,
   * 想切回来一键即可,不必重新打满二十场。收益可多处并存,历练一次只一处。
   */
  describe('镇压资格 · 收益自由开关', () => {
    it('停取收益不丢资格,可一键切回', () => {
      const player = usePlayerStore()
      player.markSuppressQualified('qingyun')
      player.suppressRegion('qingyun')
      expect(player.suppressedRegions).toContain('qingyun')

      player.unsuppressRegion('qingyun')
      expect(player.suppressedRegions).not.toContain('qingyun')
      expect(player.suppressQualified, '资格不该随停取而失去').toContain('qingyun')

      player.suppressRegion('qingyun') // 一键切回,无需再战
      expect(player.suppressedRegions).toContain('qingyun')
    })

    it('收益可多处同时收取,资格各自独立', () => {
      const player = usePlayerStore()
      for (const id of ['qingyun', 'luoxia', 'heifeng']) {
        player.markSuppressQualified(id)
        player.suppressRegion(id)
      }
      expect([...player.suppressedRegions].sort()).toEqual(['heifeng', 'luoxia', 'qingyun'])
      player.unsuppressRegion('luoxia')
      expect([...player.suppressedRegions].sort()).toEqual(['heifeng', 'qingyun'])
      expect(player.suppressQualified).toContain('luoxia')
    })

    it('资格幂等:重复取得不会写重', () => {
      const player = usePlayerStore()
      player.markSuppressQualified('qingyun')
      player.markSuppressQualified('qingyun')
      expect(player.suppressQualified.filter(id => id === 'qingyun')).toHaveLength(1)
    })

    it('旧存档修复:已有镇压区域自动视为已取得资格', () => {
      const player = usePlayerStore()
      player.suppressedRegions = ['qingyun']
      player.suppressQualified = []
      player.sanitize()
      expect(player.suppressQualified, '老存档不该丢失镇压资格').toContain('qingyun')
    })
  })

  describe('checkSuppression', () => {
    it('战斗次数不足时不触发镇压', () => {
      const player = usePlayerStore()
      player.regionStats.qingyun = {
        totalFights: 10,
        avgRounds: 2,
        avgDamageTakenPct: 0.05,
        consecutiveWins: 10,
        lastUpdateAt: Date.now()
      }

      expect(checkSuppression(player, 'qingyun')).toBe(false)
    })

    it('平均回合数过高时不触发镇压', () => {
      const player = usePlayerStore()
      player.regionStats.qingyun = {
        totalFights: 20,
        avgRounds: 5, // 超过阈值 3
        avgDamageTakenPct: 0.05,
        consecutiveWins: 20,
        lastUpdateAt: Date.now()
      }

      expect(checkSuppression(player, 'qingyun')).toBe(false)
    })

    it('平均受伤过高时不触发镇压', () => {
      const player = usePlayerStore()
      player.regionStats.qingyun = {
        totalFights: 20,
        avgRounds: 2,
        avgDamageTakenPct: 0.15, // 超过阈值 10%
        consecutiveWins: 20,
        lastUpdateAt: Date.now()
      }

      expect(checkSuppression(player, 'qingyun')).toBe(false)
    })

    it('满足所有条件时触发镇压', () => {
      const player = usePlayerStore()
      player.regionStats.qingyun = {
        totalFights: 20,
        avgRounds: 2,
        avgDamageTakenPct: 0.05,
        consecutiveWins: 20,
        lastUpdateAt: Date.now()
      }

      expect(checkSuppression(player, 'qingyun')).toBe(true)
    })

    it('已镇压的区域不重复触发', () => {
      const player = usePlayerStore()
      player.suppressedRegions = ['qingyun']
      player.regionStats.qingyun = {
        totalFights: 20,
        avgRounds: 2,
        avgDamageTakenPct: 0.05,
        consecutiveWins: 20,
        lastUpdateAt: Date.now()
      }

      expect(checkSuppression(player, 'qingyun')).toBe(false)
    })
  })

  describe('settleSuppressedRegions', () => {
    it('无镇压区域时不产出', () => {
      const resources = useResourcesStore()
      const initialStone = { ...resources.spiritStone }

      settleSuppressedRegions(60) // 1 分钟

      expect(resources.spiritStone).toEqual(initialStone)
    })

    it('镇压区域每小时产出灵石', () => {
      const player = usePlayerStore()
      player.major = 3 // 筑基境
      player.suppressedRegions = ['qingyun']
      const resources = useResourcesStore()
      const initialStone = { ...resources.spiritStone }

      // 模拟 1 小时
      settleSuppressedRegions(3600)

      // 应该有灵石增长
      expect(resources.spiritStone.m).toBeGreaterThan(initialStone.m)
    })

    it('镇压区域产出装备并按回收规则处置(入包或化尘)', () => {
      const player = usePlayerStore()
      player.major = 3
      player.suppressedRegions = ['qingyun']
      const inventory = useInventoryStore()
      const resources = useResourcesStore()

      // 模拟随机数确保掉落(equipChance 0.4 × 1h > 0.1)
      vi.spyOn(Math, 'random').mockReturnValue(0.1)

      const itemsBefore = inventory.items.length
      const dustBefore = resources.dust
      const total = settleSuppressedRegions(3600) // 1 小时

      // 必掉 1 件;处置记账必须自洽:入包则件数+1且不化尘,回收则器灵尘按档位到账且不入包
      expect(total).not.toBeNull()
      expect(total!.equipment).toHaveLength(1)
      const eq = total!.equipment[0]!
      const dustGain = resources.dust - dustBefore
      if (eq.recycled) {
        expect(inventory.items.length).toBe(itemsBefore)
        expect(dustGain).toBe(DECOMPOSE_DUST[qualityDef(eq.quality).rank] ?? 1)
        expect(total!.recycledDust).toBe(dustGain)
      } else {
        expect(inventory.items.length).toBe(itemsBefore + 1)
        expect(dustGain).toBe(0)
        expect(total!.recycledDust).toBe(0)
      }

      vi.restoreAllMocks()
    })

    it('长时离线装备按次数期望产出,不再被压成每区仅 1 件', () => {
      const player = usePlayerStore()
      player.major = 5
      player.suppressedRegions = ['qingyun']

      // 24h → equipChance = 0.4×24 = 9.6。旧实现 `random < 9.6` 恒真但只掉 1 件;
      // 修复后 floor(9.6)=9 + 零头 60% 概率第 10 件。mock 0 → 零头必中,共 10 件
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const total = settleSuppressedRegions(24 * 3600)

      expect(total).not.toBeNull()
      expect(total!.equipment.length).toBeGreaterThan(1)
      expect(total!.equipment).toHaveLength(10)

      vi.restoreAllMocks()
    })

    it('多个镇压区域同时产出', () => {
      const player = usePlayerStore()
      player.major = 5
      player.suppressedRegions = ['qingyun', 'cangwu']
      const resources = useResourcesStore()
      const initialStone = { ...resources.spiritStone }

      settleSuppressedRegions(3600)

      // 灵石增长应该是两个区域的总和
      const gain = resources.spiritStone.m - initialStone.m
      expect(gain).toBeGreaterThan(0)
    })
  })
})
