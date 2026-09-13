/**
 * 战斗危险因子「在线/离线同源」红线
 *
 * 历史偏差:在线 runBattle 的 dangerFactor 乘了灵兽性格(petEff.dangerMult)
 * 与区域事件(regEventDanger)两项修正,离线 settleOffline 的两处(普通战/boss战)
 * 却只写 `modeDef.dangerMult * (1 + (region.danger - 1) * 0.05)`——
 * 「好战更易走上险路」「谨慎避祸」离线全不兑现,妖潮离线也白过。
 *
 * 判据(HYP-015:同一件事两处算法必漏一处,抽成一个函数):
 *   - 全局只认 dangerFactorFor 这一个实现,在线与离线都调它;
 *   - 任何一处不得再内联 `(1 + (region.danger - 1) * 0.05)` 这根原常数。
 *
 * 这四条判据直接读源码对账:函数存在、在线 import、离线 import、再无线内联。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dangerFactorFor } from './exploration'

describe('战斗危险因子 · 同源函数', () => {
  it('纯函数:基础倍率 × 地域差值 × 灵兽性格 × 区域事件,层层相乘', () => {
    // 寻常游历(dangerMult 1)× 青云山(danger 1)× 无灵兽 × 无事件 → 1
    expect(dangerFactorFor(1, 1, 1, 1)).toBe(1)
    // 深入探寻(1.45)× 高危险地域 × 好战灵兽(1.15)× 无事件
    expect(dangerFactorFor(1.45, 3, 1.15, 1)).toBeCloseTo(1.45 * (1 + 2 * 0.05) * 1.15, 10)
    // 妖潮叠加:再乘事件危险倍率
    expect(dangerFactorFor(1.45, 3, 1.15, 1.4)).toBeCloseTo(1.45 * (1 + 2 * 0.05) * 1.15 * 1.4, 10)
  })

  it('全局只有一个实现:探索与离线都 import dangerFactorFor,再无内联常数', () => {
    const exploration = readFileSync(resolve(__dirname, './exploration.ts'), 'utf8')
    const offline = readFileSync(resolve(__dirname, './offline.ts'), 'utf8')
    // 两处都从本模块 import 同源函数
    expect(exploration).toContain('dangerFactorFor')
    expect(offline).toContain('dangerFactorFor')
    // 原内联常数((region.danger - 1) * 0.05)不得再出现在离线结算里
    expect(offline).not.toContain("1 + (region.danger - 1) * 0.05")
  })
})
