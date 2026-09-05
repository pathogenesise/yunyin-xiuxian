import { describe, expect, it } from 'vitest'
import { formatDuration, formatGN, formatPercent } from './format'
import { gn, powN } from './gnum'

describe('数值格式化', () => {
  it('千位分隔', () => {
    expect(formatGN(1234)).toBe('1,234')
    expect(formatGN(999)).toBe('999')
  })

  it('中文单位', () => {
    expect(formatGN(123456)).toBe('12.35万')
    expect(formatGN(123456789)).toBe('1.235亿')
    expect(formatGN(1.24e13)).toBe('12.4兆')
  })

  it('尾零裁剪', () => {
    expect(formatGN(120000)).toBe('12万')
    expect(formatGN(100000000)).toBe('1亿')
  })

  it('超大数走科学计数法', () => {
    expect(formatGN(powN(10, 52))).toMatch(/e52$/)
  })

  it('零与负数', () => {
    expect(formatGN(gn(0))).toBe('0')
    expect(formatGN(-123456)).toBe('-12.35万')
  })

  it('时长', () => {
    expect(formatDuration(45)).toBe('45秒')
    expect(formatDuration(65)).toBe('1分5秒')
    expect(formatDuration(3660)).toBe('1小时1分')
    expect(formatDuration(90000)).toBe('1天1小时')
  })

  it('百分比', () => {
    expect(formatPercent(0.125)).toBe('12.5%')
    expect(formatPercent(0.5)).toBe('50%')
  })
})
