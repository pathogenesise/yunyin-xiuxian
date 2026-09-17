/* eslint-disable no-console -- 模拟器体检报告的正式输出(bun run test:report 依赖) */
import { describe, expect, it } from 'vitest'
import { fullEconomyAudit, qiFillSeconds } from './economySim'
import { BT_QI_COST_RATIO } from '@/data/constants'
import { MAX_MAJOR, worldOf } from '@/data/realms'
import { maxTierForMajor } from '@/data/regions'

/**
 * 审计的判据分两段,理由写在 economySim 的文件头:
 *
 * - **人间界(0~8)**:模型在此校准(建筑还在长、掉落按人间界层级),健康不变量按原样守 ——
 *   灵石不窒息也不失意义、灵草买得起丹、器灵尘自给、无死资源。
 * - **界外十二境(9~20)**:同一套公式,但**出口大半不在模型里**(建筑早已封顶,
 *   玄铁/残页/器灵尘真正的去向是天道熔炉 → 道源)。故这一段只守「读数有定义、
 *   层级跟随区域表、修为比值不漂移」,外加把整张表打出来;健康不变量等出口模型补齐
 *   再上(见 ISS-210)。
 */
describe('经济闭环审计(Phase 19 · Phase 40 补界外与修为)', () => {
  const eras = fullEconomyAudit()
  const mortal = eras.filter(e => worldOf(e.major).id === 'mortal')
  const outer = eras.filter(e => worldOf(e.major).id !== 'mortal')

  it('输出全时期流水表:0~20 境,含修为', () => {
    console.log('\n—— 资源生产/消耗审计(每小时,按时期摊销) ——')
    for (const era of eras) {
      const cells = era.flows
        .map(f => `${f.resource}:${f.verdict}(${f.ratio === Infinity ? '∞' : f.ratio.toFixed(1)})`)
        .join(' ')
      console.log(`  第${era.major}境(${worldOf(era.major).name}·t${era.tier}, ${era.eraHours.toFixed(1)}h): ${cells}`)
    }
    expect(eras.length).toBe(MAX_MAJOR + 1)
    expect(mortal.length, '人间界应有 0~8 共九境').toBe(9)
    expect(outer.length, '界外应有 9~20 共十二境').toBe(12)
    for (const era of eras) expect(era.flows.length, `第${era.major}境缺流`).toBe(7)
  })

  it('修为是一条流,且收支比不随境界漂移(Phase 39 修出的性质)', () => {
    const ratios = eras.map(era => {
      const exp = era.flows.find(f => f.resource === 'exp')
      expect(exp, `第${era.major}境没有修为流`).toBeDefined()
      return exp!.ratio
    })
    for (const [i, ratio] of ratios.entries()) {
      // 收入 = 挂机(底)+ 历练(两条线都随修速缩放),消耗 = 通关本境的修为需求。
      // 两侧同尺,故「历练在任何境界都是同一个倍率」——
      // 反过来说:这个数一旦随境界漂移,就是有一侧又按境界另算了一遍(ISS-208 的旧病)。
      expect(ratio, `第${i}境修为收支比`).toBeGreaterThan(1)
      expect(ratio, `第${i}境修为收支比`).toBeLessThan(10)
    }
    expect(Math.max(...ratios) - Math.min(...ratios), '修为收支比随境界漂移了').toBeLessThan(0.01)
  })

  it('区域层级取自区域表:界外十二境是 21~32,不再压死在 20', () => {
    for (const era of eras) {
      expect(era.tier, `第${era.major}境的层级`).toBe(maxTierForMajor(era.major))
    }
    expect(eras[0]!.tier).toBe(2)
    expect(eras.at(-1)!.tier, '混沌道祖的层级应是区域表上限').toBe(32)
  })

  it('界外十二境:每一格的读数都有定义(收入与消耗非负且有限)', () => {
    for (const era of outer) {
      for (const f of era.flows) {
        expect(Number.isFinite(f.incomePerHour), `第${era.major}境 ${f.resource} 收入`).toBe(true)
        expect(Number.isFinite(f.sinkPerHour), `第${era.major}境 ${f.resource} 消耗`).toBe(true)
        expect(f.incomePerHour, `第${era.major}境 ${f.resource} 收入`).toBeGreaterThanOrEqual(0)
        expect(f.sinkPerHour, `第${era.major}境 ${f.resource} 消耗`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('人间界无死资源:每种资源在每个时期都有非零消耗去向', () => {
    for (const era of mortal) {
      for (const f of era.flows) {
        expect(f.sinkPerHour, `第${era.major}境的 ${f.resource}`).toBeGreaterThan(0)
      }
    }
  })

  it('人间界灵石经济受控:既不窒息也不失去意义', () => {
    for (const era of mortal) {
      const stone = era.flows.find(f => f.resource === 'stone')!
      expect(stone.ratio, `第${era.major}境灵石收支比`).toBeGreaterThan(0.3)
      expect(stone.ratio, `第${era.major}境灵石收支比`).toBeLessThan(30)
    }
  })

  it('人间界炼丹材料买得起:灵草收入至少覆盖半数炼丹需求', () => {
    for (const era of mortal) {
      const herb = era.flows.find(f => f.resource === 'herb')!
      expect(herb.ratio, `第${era.major}境灵草`).toBeGreaterThan(0.5)
    }
  })

  it('人间界器灵尘自给:强化消耗可由分解收入覆盖', () => {
    for (const era of mortal) {
      const dust = era.flows.find(f => f.resource === 'dust')!
      expect(dust.ratio, `第${era.major}境器灵尘`).toBeGreaterThan(0.6)
    }
  })

  it('人间界闲置预警:允许过剩,但「全时期闲置」的资源不允许超过 1 种', () => {
    const idle: string[] = []
    for (const era of mortal) {
      for (const f of era.flows) {
        if (f.verdict === '闲置') idle.push(`第${era.major}境:${f.resource}(×${f.ratio === Infinity ? '∞' : f.ratio.toFixed(0)})`)
      }
    }
    console.log(idle.length ? `\n  [人间界闲置预警] ${idle.join(' · ')}` : '\n  [人间界闲置预警] 无')
    const chronic = new Map<string, number>()
    for (const era of mortal) {
      for (const f of era.flows) {
        if (f.verdict === '闲置') chronic.set(f.resource, (chronic.get(f.resource) ?? 0) + 1)
      }
    }
    const chronicallyIdle = [...chronic.entries()].filter(([, n]) => n >= mortal.length).map(([r]) => r)
    expect(chronicallyIdle.length, `长期闲置资源: ${chronicallyIdle.join(',')}`).toBeLessThanOrEqual(1)
  })

  it('界外闲置读数单独打出来 —— 那是「出口没进模型」,不是判定', () => {
    const idle: string[] = []
    for (const era of outer) {
      for (const f of era.flows) {
        if (f.verdict !== '健康') idle.push(`第${era.major}境:${f.resource}${f.verdict}(×${f.ratio === Infinity ? '∞' : f.ratio.toFixed(0)})`)
      }
    }
    console.log(`\n  [界外读数,待补出口模型 · ISS-210] ${idle.join(' · ')}`)
    expect(idle.length, '界外一点问题都没有?那说明出口模型已经补上了,该把这段判据升级成健康不变量').toBeGreaterThan(0)
  })

  it('灵气结构健康:回满不超过 30 分钟(判据守 0~9 境,界外读数见 ISS-212)', () => {
    for (let m = 0; m <= 9; m += 1) {
      expect(qiFillSeconds(m), `第${m}境灵气回满`).toBeLessThan(1800)
    }
    expect(BT_QI_COST_RATIO).toBeLessThan(1)
    const rows: string[] = []
    for (let m = 0; m <= MAX_MAJOR; m += 1) {
      const fill = qiFillSeconds(m)
      expect(Number.isFinite(fill) && fill > 0, `第${m}境灵气回满读数`).toBe(true)
      rows.push(`第${m}境 ${fill.toFixed(0)}s`)
    }
    console.log(`\n  [灵气回满时长] ${rows.join(' · ')}`)
  })
})
