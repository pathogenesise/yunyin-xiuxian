/**
 * 灵脉投资服务的核心契约:
 *   - 四条脉平级,没有主脉/副脉之分,也没有「改立主脉」这回事
 *   - 单条可投上限由**效果本身的数值上限**折算,不是另设的灵脉规则
 *   - 没有硬上限但设了点数封顶的(如疾风 20000 点)按点数封顶;
 *     两者皆无的(如青木修炼速度)视作没有投资上限
 * 这里把服务契约锁死,杜绝 UI 与服务再分叉。
 */
import { setActivePinia, createPinia } from 'pinia'
import { describe, expect, it, beforeEach } from 'vitest'
import { gn } from '@/utils/gnum'
import { INSIGHT_DISCOUNT_PER_POINT, VEIN_EFFECT_CAPS } from '@/data/veins'
import { investVein, veinCap } from './veinService'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useResourcesStore } from '@/stores/resources'

describe('灵脉投资', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const player = usePlayerStore()
    player.major = 2 // 金丹,灵脉开放
    useResourcesStore().spiritStone = gn(1e30) // 足够覆盖长期投入
  })

  it('四条脉平级:任何一条都可长期投,没有主脉/副脉之分', () => {
    const dongfu = useDongfuStore()
    // 修炼速度无硬上限 ⇒ 无上限;疾风有点数封顶;其余按各自效果上限折算
    expect(veinCap('gather')).toBeNull()
    expect(veinCap('swift')).toBe(20000)
    expect(veinCap('craft')).toBe(Math.floor(VEIN_EFFECT_CAPS.forgeDiscount / 0.003))
    expect(veinCap('alchemy')).toBe(Math.floor(VEIN_EFFECT_CAPS.alchemyYield / 0.005))
    expect(veinCap('insight')).toBe(Math.floor(VEIN_EFFECT_CAPS.insightDiscount / INSIGHT_DISCOUNT_PER_POINT))

    for (let i = 0; i < 300; i += 1) expect(investVein('gather'), `青木灵脉第 ${i + 1} 点应能投`).toBe(true)
    expect(dongfu.veinPoints.gather).toBe(300)
    expect(dongfu.veinTotal).toBe(300)
  })

  it('有上限的脉投到上限即止:上限点数 × 每点效果正好落在效果硬线上', () => {
    const dongfu = useDongfuStore()
    const cap = veinCap('alchemy')!
    for (let i = 0; i < cap; i += 1) expect(investVein('alchemy')).toBe(true)
    expect(dongfu.veinPoints.alchemy).toBe(cap)
    expect(investVein('alchemy'), '到了效果上限不该再收灵石').toBe(false)
    // 恰好落在线上,不是踩过头
    expect(dongfu.veinPoints.alchemy * 0.005).toBeCloseTo(VEIN_EFFECT_CAPS.alchemyYield, 10)
    expect(dongfu.veinPoints.alchemy * 0.005).toBeLessThanOrEqual(VEIN_EFFECT_CAPS.alchemyYield)
  })

  it('超上限的部分不计数值:把点数写穿,加成仍停在硬线上', () => {
    const dongfu = useDongfuStore()
    const cap = veinCap('insight')!
    dongfu.veinPoints.insight = cap * 5 // 旧存档里超投的点数
    expect(dongfu.insightDiscount, '超投部分不该多出数值').toBeCloseTo(VEIN_EFFECT_CAPS.insightDiscount, 10)
    expect(dongfu.insightDiscount).toBeLessThanOrEqual(VEIN_EFFECT_CAPS.insightDiscount)

    dongfu.veinPoints.craft = veinCap('craft')! * 3
    expect(dongfu.veinMods.forgeDiscount, '炼器脉超投也该封顶').toBeCloseTo(VEIN_EFFECT_CAPS.forgeDiscount, 10)

    // 未超投时按实算
    dongfu.veinPoints.alchemy = 10
    expect(dongfu.veinMods.alchemyYield).toBeCloseTo(0.05, 10)
  })

  it('缺灵石时不动点数', () => {
    const dongfu = useDongfuStore()
    useResourcesStore().spiritStone = gn(0)
    expect(investVein('gather')).toBe(false)
    expect(dongfu.veinPoints.gather).toBe(0)
  })
})
