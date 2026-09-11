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
      if (n < 100 && !Number.isInteger(n)) {
        // 0.04 显示成 0.04、0.004 也应收着——任何正收益都不该因为太细碎而显示成 0。
        // 位数随数量级抬升(0.04→2 位,0.004→3 位),封顶 6 位,杜绝 0.0000000001 刷屏
        const tiny = n > 0 && n < 0.1 ? n.toFixed(Math.max(2, Math.min(6, 1 - Math.floor(Math.log10(n))))) : n.toFixed(1)
        return trimZero(tiny)
      }
      // 与 <100 档(四舍五入)一致,不再向下取整:999.6 显示 1000 而非 999
      return String(Math.round(n))
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

/** 数值非法时的统一占位(避免界面出现 NaN%/Infinity%) */
const NOT_AVAILABLE = '--'

/** 百分比:0.125 → 12.5%;非法值(NaN/Infinity)显示 -- */
export function formatPercent(x: number, dp = 1): string {
  if (!Number.isFinite(x)) return NOT_AVAILABLE
  const v = x * 100
  // -0.001% 这类连一位小数都到不了的极小值,不该显示成「-0%」吓人
  if (Math.abs(v) < Math.pow(10, -dp)) return '0%'
  const s = Number.isInteger(v) ? String(v) : v.toFixed(dp)
  return `${trimZero(s)}%`
}

/** 时长:秒 → 中文可读;非法值(NaN/Infinity)显示 -- */
export function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec)) return NOT_AVAILABLE
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
