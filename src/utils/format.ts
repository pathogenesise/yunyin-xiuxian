/**
 * 统一数值格式化 —— 中文单位 + 科学计数法兜底
 */
import type { GNum } from '@/types'
import { gn, toNum } from './gnum'

/** 每 4 个数量级一个中文单位 */
const UNITS = ['万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极'] as const

/** 格式化大数:1,234 → 12.35万 → 1.235亿 → 1.24e52 */
export function formatGN(v: GNum | number): string {
  const g = typeof v === 'number' ? gn(v) : v
  if (g.m === 0) return '0'
  if (g.m < 0) return '-' + formatGN({ m: -g.m, e: g.e })
  if (g.e < 4) {
    const n = toNum(g)
    if (n < 1000) {
      return n < 100 && !Number.isInteger(n) ? trimZero(n.toFixed(1)) : String(Math.floor(n))
    }
    return Math.floor(n).toLocaleString('en-US')
  }
  const unitIdx = Math.floor(g.e / 4) - 1
  if (unitIdx >= UNITS.length) {
    return `${g.m.toFixed(2)}e${g.e}`
  }
  const value = g.m * Math.pow(10, g.e - (unitIdx + 1) * 4)
  return trimZero(fixedByMag(value)) + UNITS[unitIdx]
}

function fixedByMag(v: number): string {
  if (v < 10) return v.toFixed(3)
  if (v < 100) return v.toFixed(2)
  if (v < 1000) return v.toFixed(1)
  return String(Math.floor(v))
}

function trimZero(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** 格式化普通数字(整数展示) */
export function formatNum(n: number): string {
  return formatGN(gn(n))
}

/** 速率:xx/秒 */
export function formatRate(v: GNum | number): string {
  return `${formatGN(v)}/秒`
}

/** 百分比:0.125 → 12.5% */
export function formatPercent(x: number, dp = 1): string {
  const v = x * 100
  const s = Number.isInteger(v) ? String(v) : v.toFixed(dp)
  return `${trimZero(s)}%`
}

/** 时长:秒 → 中文可读 */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (d > 0) return `${d}天${h}小时`
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

/** 寿元年数展示 */
export function formatYears(y: number): string {
  if (y >= 10000) return formatNum(Math.floor(y)) + '载'
  return `${Math.floor(y)}载`
}
