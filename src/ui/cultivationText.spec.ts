import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  breakthroughExpReason,
  breakthroughPeakReason,
  breakthroughQiReason,
  prepPillShortToast,
  repairActLabel,
  repairDoneToast,
  repairIdleToast,
  repairShortToast
} from './cultivationText'

describe('修行页提示 · 文言仍报清缕数与药资', () => {
  it('疗伤缺气、落成、无伤,不说不足', () => {
    expect(repairIdleToast()).toContain('无恙')
    expect(repairShortToast('120')).toBe('灵气未足,静养需 120 缕')
    expect(repairShortToast('120')).not.toContain('不足')
    expect(repairDoneToast('120')).toContain('耗灵气 120')
    expect(repairActLabel(true, '80')).toContain('引气疗伤')
    expect(repairActLabel(false, '80')).toBe(repairShortToast('80'))
  })

  it('备药与突破门槛仍报灵石、灵气', () => {
    expect(prepPillShortToast()).toContain('灵石')
    expect(prepPillShortToast()).toContain('备药')
    expect(prepPillShortToast()).not.toContain('不足')
    expect(breakthroughPeakReason()).toContain('大道尽头')
    expect(breakthroughExpReason()).toContain('圆满')
    expect(breakthroughQiReason('40')).toBe('灵气未足,此关需 40 缕')
  })
})

describe('修行页与提示同源', () => {
  it('疗伤按钮与备药 toast 走 cultivationText', () => {
    const view = readFileSync(new URL('../views/CultivationView.vue', import.meta.url), 'utf8')
    expect(view).toContain('repairActLabel(')
    expect(view).toContain('prepPillShortToast()')
    expect(view).not.toContain('灵气不足')
    expect(view).not.toContain('灵石不足')
  })
})
