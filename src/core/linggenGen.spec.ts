import { describe, expect, it } from 'vitest'
import { mulberry32, RandomService } from '@/utils/random'
import { rollLinggen } from './linggenGen'

describe('灵根生成', () => {
  it('灵根数量与资质范围合法', () => {
    const rng = new RandomService(mulberry32(2024))
    for (let i = 0; i < 300; i += 1) {
      const p = rollLinggen(rng)
      expect(p.roots.length).toBeGreaterThanOrEqual(1)
      expect(p.roots.length).toBeLessThanOrEqual(5)
      for (const r of p.roots) {
        expect(r.aptitude).toBeGreaterThanOrEqual(40)
        expect(r.aptitude).toBeLessThanOrEqual(100)
      }
      expect(p.growthMult).toBeGreaterThan(0.3)
      expect(p.growthMult).toBeLessThanOrEqual(4.5)
      expect(p.gradeName.length).toBeGreaterThan(1)
    }
  })

  it('转世资质保底生效', () => {
    const rng = new RandomService(mulberry32(7))
    for (let i = 0; i < 100; i += 1) {
      const p = rollLinggen(rng, 30)
      for (const r of p.roots) {
        expect(r.aptitude).toBeGreaterThanOrEqual(70)
      }
    }
  })

  it('元素不重复', () => {
    const rng = new RandomService(mulberry32(13))
    for (let i = 0; i < 200; i += 1) {
      const p = rollLinggen(rng)
      const els = p.roots.map(r => r.element)
      expect(new Set(els).size).toBe(els.length)
    }
  })
})
