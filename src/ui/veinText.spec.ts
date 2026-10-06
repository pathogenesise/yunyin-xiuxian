import { describe, expect, it } from 'vitest'
import { VEINS, INSIGHT_DISCOUNT_PER_POINT, INSIGHT_EFFECT_NAME, VEIN_EFFECT_CAPS } from '@/data/veins'
import { formatPercent } from '@/utils/format'
import { STAT_NAMES } from './statNames'
import { effectiveVeinPoints, veinBatchDoneToast, veinEffectText, veinPeakToast, veinShortToast } from './veinText'
import type { AnyStatKey } from '@/types'

describe('灵脉效果行与每点加成同源', () => {
  it('有 perPoint 的脉,百分比就是每点数值乘点数', () => {
    for (const def of VEINS) {
      const points = 10
      const line = veinEffectText(def, points)
      for (const [k, raw] of Object.entries(def.perPoint)) {
        if (typeof raw !== 'number' || raw === 0) continue
        const name = STAT_NAMES[k as AnyStatKey] ?? k
        expect(line, def.name).toContain(`${name} +${formatPercent(raw * points)}`)
      }
    }
  })

  it('悟道脉读折扣常数,不另写 0.4', () => {
    const insight = VEINS.find(v => v.id === 'insight')!
    expect(veinEffectText(insight, 1)).toBe(`${INSIGHT_EFFECT_NAME} −${formatPercent(INSIGHT_DISCOUNT_PER_POINT)}`)
    expect(veinEffectText(insight, 1)).not.toContain('双成')
    expect(veinEffectText(insight, 1)).not.toContain('耗材')
  })

  it('超上限的读数封顶:超过硬线后不再往上报', () => {
    const alchemy = VEINS.find(v => v.id === 'alchemy')!
    const cap = Math.floor(VEIN_EFFECT_CAPS.alchemyYield / 0.005)
    expect(effectiveVeinPoints('alchemy', cap)).toBe(cap)
    expect(veinEffectText(alchemy, cap)).toContain(formatPercent(VEIN_EFFECT_CAPS.alchemyYield))
    // 超投之后读数与到顶时逐字相同
    expect(veinEffectText(alchemy, cap * 4)).toBe(veinEffectText(alchemy, cap))
    expect(effectiveVeinPoints('alchemy', cap * 4)).toBe(cap)

    // 修炼速度没有硬上限 ⇒ 不封顶;疾风有点数封顶但不封数值,超封顶读数照实
    expect(effectiveVeinPoints('gather', 9999)).toBe(9999)
    expect(effectiveVeinPoints('swift', 35049455)).toBe(35049455)
  })
})

describe('灵脉投点提示 · 文言报清到顶与灵石', () => {
  it('到顶、缺石,不说不足', () => {
    expect(veinPeakToast('玉髓灵脉')).toContain('玉髓灵脉')
    expect(veinPeakToast('玉髓灵脉')).toContain('不再增')
    expect(veinPeakToast()).not.toContain('主脉')
    expect(veinShortToast()).toContain('灵石')
    expect(veinShortToast()).not.toContain('不足')
  })
})

describe('灵脉连投总结账', () => {
  it('连投报点数与总耗,不带主脉措辞', () => {
    const line = veinBatchDoneToast('赤炎灵脉', 12, '1.2万')
    expect(line).toContain('连注 12 点')
    expect(line).toContain('1.2万')
    expect(line).not.toContain('主脉')
  })
})
