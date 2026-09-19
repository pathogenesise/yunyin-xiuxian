import { describe, expect, it } from 'vitest'
import { VEINS } from '@/data/veins'
import { INSIGHT_DISCOUNT_PER_POINT, INSIGHT_EFFECT_NAME } from '@/data/veins'
import { formatPercent } from '@/utils/format'
import { STAT_NAMES } from './statNames'
import { veinEffectText } from './veinText'
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
})
