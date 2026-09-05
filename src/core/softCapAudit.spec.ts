/* eslint-disable no-console -- Phase 30.4 软阈值审计报告 */
import { describe, expect, it } from 'vitest'
import { ENEMY_ARCHETYPES, fullMatrix, type MatrixRow } from './buildSim'
import { searchBuilds } from './buildSearch'

/**
 * Phase 30.4:属性软阈值审计
 *
 * 目标:验证软阈值(SOFT_CAPS)是否破坏 Phase 19-25 建立的生态平衡
 *
 * 审计维度:
 * 1. 流派胜率变化(6流派 × 7敌型)
 * 2. 破墙构筑数量变化(万金油红线 ≤1.5%)
 * 3. 战力-胜率相关系数变化(r 应维持在 0.15-0.92)
 * 4. 特别关注:罡盾是否进一步变强,背水/连击是否被削,锋芒/沐泽是否受软阈值压制
 *
 * 基线:当前版本(含软阈值)作为 Phase 30 baseline
 * 对照:需与 Phase 25 数据对比(如有存档)
 */

const N = 80 // 每个流派对战每种敌型的场次

function cell(rows: MatrixRow[], buildId: string, archId: string): number {
  return rows.find(r => r.build.id === buildId)!.cells[archId]!.winRate
}

describe('Phase 30.4:软阈值对流派生态的影响审计', () => {
  const matrix = fullMatrix(N)
  const searchReport = searchBuilds(1000, 20)

  it('输出当前流派生态 baseline(含软阈值)', () => {
    console.log('\n—— Phase 30.4 流派生态 Baseline(含软阈值) ——')
    console.log('  流派 × 敌型胜率矩阵(各 ' + N + ' 场):')

    const header = ['流派  ', ...ENEMY_ARCHETYPES.map(a => a.name.padStart(4, ' ')), '  均值'].join(' | ')
    console.log('  ' + header)

    for (const row of matrix) {
      const cells = ENEMY_ARCHETYPES.map(a => `${Math.round(row.cells[a.id]!.winRate * 100)}%`.padStart(4, ' '))
      console.log(`  ${row.build.name} | ${cells.join(' | ')} | ${Math.round(row.avgWinRate * 100)}%`)
    }

    console.log('\n  随机构筑搜索统计(1000 构筑 × 140 场):')
    console.log(`    战力-胜率相关系数 r = ${searchReport.powerCorrelation.toFixed(2)}`)
    console.log(`    万金油构筑: ${searchReport.universals.length} (${(searchReport.universals.length / 10).toFixed(1)}%)`)
    console.log(`    陷阱构筑: ${searchReport.traps.length} (${(searchReport.traps.length / 10).toFixed(1)}%)`)

    expect(matrix.length).toBe(6)
  })

  it('流派均衡性:无废柴也无霸主(45%-88%)', () => {
    for (const row of matrix) {
      expect(row.avgWinRate, `${row.build.name} 综合胜率`).toBeGreaterThan(0.45)
      expect(row.avgWinRate, `${row.build.name} 综合胜率`).toBeLessThan(0.88)
    }

    const avgs = matrix.map(r => r.avgWinRate)
    const range = Math.max(...avgs) - Math.min(...avgs)
    expect(range, '流派胜率极差').toBeLessThan(0.3)
  })

  it('罡盾审计:是否因减伤软阈值进一步变强', () => {
    const gangdun = matrix.find(r => r.build.id === 'gangdun')!
    // 罡盾综合胜率应在健康区间,不应因软阈值削弱其他流派而相对变强
    expect(gangdun.avgWinRate, '罡盾综合胜率').toBeLessThan(0.82)

    // 罡盾对真伤仍应显著弱于其最强场景(真伤是护盾天敌)
    const rates = ENEMY_ARCHETYPES.map(a => gangdun.cells[a.id]!.winRate)
    const best = Math.max(...rates)
    const pierce = gangdun.cells.pierce!.winRate
    expect(best - pierce, '罡盾·真伤短板').toBeGreaterThan(0.12)
  })

  it('背水审计:是否因生命软阈值被过度削弱', () => {
    const beishui = matrix.find(r => r.build.id === 'beishui')!
    const lianji = matrix.find(r => r.build.id === 'lianji')!
    const fengmang = matrix.find(r => r.build.id === 'fengmang')!

    // 背水依赖低血触发,生命软阈值不应破坏其核心机制
    expect(beishui.avgWinRate, '背水综合胜率').toBeGreaterThan(0.45)

    // 背水对首领应保持相对优势(Phase 16/21 确立:背水是攻击流中最擅攻坚的)
    const beishuiBoss = beishui.cells.boss!.winRate
    const lianjiBoss = lianji.cells.boss!.winRate
    const fengmangBoss = fengmang.cells.boss!.winRate
    expect(beishuiBoss, '背水攻坚优于连击').toBeGreaterThan(lianjiBoss + 0.1)
    expect(beishuiBoss, '背水攻坚优于锋芒').toBeGreaterThan(fengmangBoss + 0.1)
  })

  it('连击审计:是否因速度软阈值受过大影响', () => {
    const lianji = matrix.find(r => r.build.id === 'lianji')!
    // 连击依赖多次攻击,速度软阈值不应破坏其核心
    expect(lianji.avgWinRate, '连击综合胜率').toBeGreaterThan(0.45)

    // 连击对疾影的劣势应保持(Phase 16 克制关系)
    const normal = lianji.cells.normal!.winRate
    const dodge = lianji.cells.dodge!.winRate
    expect(normal - dodge, '连击·疾影克制').toBeGreaterThan(0.12)
  })

  it('锋芒审计:是否因攻击软阈值被压制', () => {
    const fengmang = matrix.find(r => r.build.id === 'fengmang')!
    // 锋芒堆攻击,软阈值可能削弱其爆发
    expect(fengmang.avgWinRate, '锋芒综合胜率').toBeGreaterThan(0.45)

    // 锋芒对首领仍应乏力(Phase 16 设计短板)
    const boss = fengmang.cells.boss!.winRate
    expect(boss, '锋芒攻坚短板').toBeLessThan(0.4)
  })

  it('沐泽审计:生命/续航软阈值是否产生新破墙', () => {
    const muze = matrix.find(r => r.build.id === 'muze')!
    // 沐泽依赖回复和生命池,软阈值可能影响其持久战能力
    expect(muze.avgWinRate, '沐泽综合胜率').toBeGreaterThan(0.45)

    // 沐泽对首领应优于爆发(Phase 16 确立的久战特性)
    const boss = muze.cells.boss!.winRate
    const burst = muze.cells.burst!.winRate
    expect(boss - burst, '沐泽·久战优势').toBeGreaterThan(0.08)
  })

  it('万金油红线:破墙构筑占比 ≤1.5%(软阈值不应加剧问题)', () => {
    const universalRate = searchReport.universals.length / searchReport.results.length
    expect(universalRate, '破墙构筑占比').toBeLessThanOrEqual(0.015)
  })

  it('战力-胜率解耦:相关系数应维持在健康区间(0.15-0.92)', () => {
    expect(searchReport.powerCorrelation, '战力-胜率相关系数').toBeGreaterThan(0.15)
    expect(searchReport.powerCorrelation, '战力-胜率相关系数').toBeLessThan(0.92)
  })

  it('克制关系存续:软阈值不应模糊既有克制矩阵', () => {
    // 破盾斩杀:罡盾对真伤仍应显著弱于其他场景
    const gangdun = matrix.find(r => r.build.id === 'gangdun')!
    const gdRates = ENEMY_ARCHETYPES.map(a => gangdun.cells[a.id]!.winRate)
    expect(Math.max(...gdRates) - gangdun.cells.pierce!.winRate).toBeGreaterThan(0.12)

    // 反震吃多段:反震对多段应优于疾影
    expect(cell(matrix, 'fanzhen', 'multi')).toBeGreaterThan(cell(matrix, 'fanzhen', 'dodge') + 0.12)

    // 连击怕闪避:连击对常规应优于疾影
    expect(cell(matrix, 'lianji', 'normal')).toBeGreaterThan(cell(matrix, 'lianji', 'dodge') + 0.12)
  })
})
