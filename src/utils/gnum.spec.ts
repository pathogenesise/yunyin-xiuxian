import { describe, expect, it } from 'vitest'
import { add, cmp, div, gn, gte, mul, mulN, powN, progress, ratio, sub, subClamp, toNum } from './gnum'

describe('GameNumber 大数运算', () => {
  it('构造与规范化', () => {
    expect(gn(0)).toEqual({ m: 0, e: 0 })
    expect(gn(1234)).toEqual({ m: 1.234, e: 3 })
    expect(gn(0.5).m).toBeCloseTo(5)
    expect(gn(0.5).e).toBe(-1)
  })

  it('损坏数据回退为零', () => {
    expect(gn({ m: Number.NaN, e: 2 })).toEqual({ m: 0, e: 0 })
    expect(gn(null as unknown as number)).toEqual({ m: 0, e: 0 })
  })

  it('加减法', () => {
    expect(toNum(add(gn(100), gn(23)))).toBeCloseTo(123)
    expect(toNum(sub(gn(100), gn(30)))).toBeCloseTo(70)
    expect(subClamp(gn(10), gn(100))).toEqual({ m: 0, e: 0 })
  })

  it('量级悬殊时小数被忽略', () => {
    const big = gn(1e30)
    expect(add(big, gn(1))).toEqual(big)
  })

  it('乘除法与幂', () => {
    expect(toNum(mul(gn(200), gn(300)))).toBeCloseTo(60000)
    expect(toNum(div(gn(1e10), gn(4)))).toBeCloseTo(2.5e9)
    expect(toNum(mulN(gn(50), 3))).toBeCloseTo(150)
    const p = powN(24, 9)
    expect(p.e).toBeGreaterThan(11)
    expect(toNum(p) / Math.pow(24, 9)).toBeCloseTo(1, 6)
  })

  it('超大数不溢出', () => {
    const huge = powN(10, 500)
    expect(huge.e).toBe(500)
    expect(toNum(mul(huge, huge))).toBe(Infinity)
    expect(mul(huge, huge).e).toBe(1000)
  })

  it('比较', () => {
    expect(cmp(gn(100), gn(99))).toBe(1)
    expect(cmp(gn(1e20), gn(2e20))).toBe(-1)
    expect(gte(gn(5), gn(5))).toBe(true)
  })

  it('比值与进度', () => {
    expect(ratio(gn(50), gn(200))).toBeCloseTo(0.25)
    expect(progress(gn(150), gn(100))).toBe(1)
    expect(progress(gn(0), gn(100))).toBe(0)
  })
})
