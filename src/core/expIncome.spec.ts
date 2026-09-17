/* eslint-disable no-console -- 两条收入线的对账表是给人看的 */
/**
 * 修为收入结构 —— 守设计不变量,不守当时的快照
 *
 * Phase 39 续的设计口径(见 core/expIncome 头部与设计记录):
 *   挂机修炼是基线(1.0×),历练是**有界加速器**(≈1.6×,另给掉落),
 *   闭关是专修那条路(2.5×,期间不能历练)—— 三个倍率都不随境界变,
 *   因为三条来源都只跟"修速"走。
 *
 * 每个用例对应一个玩家能理解的场景,而不是把常数再抄一遍:
 *   ① 倍率场景:21 境的历练倍率都落在 1.5~2.0、彼此完全相同,
 *      且都低于闭关(2.5×)—— 「专心修炼比出门更快」是一条设计不变量
 *   ② 通关场景:界末圆满那道修为墙,单靠战斗也要十天以上(不是几分钟能刷穿)
 *   ③ 前期场景:炼气期一场遭遇(哪怕叠满首领/涉险/福缘)填不满一层
 *   ④ 同源场景:离线 N 场 = N 次单场(上限一并放大,不偷跑)
 *   ⑤ 一把尺子:同一段时长在深境只更不值钱;修速翻倍则收益翻倍
 *   ⑥ 接线红线:四条来源都走同一个结算函数(读源码,不在别处另写百分比)
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  TYPICAL_EVENT_EXP_SECS,
  battleExpSecsAt,
  battlesPerHour,
  encountersPerHour,
  eventsPerHour,
  expIncomeAt,
  expIncomeAudit
} from './expIncome'
import { BATTLE_EXP_SECS, INSTANT_EXP_LAYER_CAP } from '@/data/constants'
import { buffDef } from '@/data/buffs'
import { EVENTS } from '@/data/events'
import { CHAIN_EVENTS } from '@/data/chains'
import { MAX_MAJOR, REALMS } from '@/data/realms'
import { expFromSecs, expRequirement } from './formulas'
import { layerSeconds } from './pillValue'
import { toNum } from '@/utils/gnum'

/** 闭关那条专修路线 = 1 + 闭关的修速加成(取自 buffs 本体,不在这里抄一个 150%) */
const RETREAT_MULT = 1 + (buffDef('retreat')?.mods.cultivationSpeed ?? 0)

describe('修为收入 · 设计不变量', () => {
  const rows = expIncomeAudit()

  it('对账表:两条线都折成「等效闭关秒/小时」', () => {
    console.log(`\n—— 修为收入(等效闭关秒/小时;每时 ${encountersPerHour().toFixed(0)} 次遭遇) ——`)
    for (const r of rows) {
      const trip = r.battlePerHour + r.eventPerHour
      console.log(
        `  ${REALMS[r.major]!.name.padEnd(5)} 挂机 ${r.idlePerHour} · 历练 ${Math.round(trip)}` +
          `(战 ${Math.round(r.battlePerHour)} + 遇 ${Math.round(r.eventPerHour)}) → ×${r.ratio.toFixed(2)}`
      )
    }
    expect(rows.length).toBe(MAX_MAJOR + 1)
  })

  it('① 全时历练 ≈ 挂机的 1.6 倍,21 境一模一样,且低于闭关', () => {
    for (const r of rows) {
      expect(r.ratio, `${REALMS[r.major]!.name} 的历练倍率落在设计区间之外`).toBeGreaterThan(1.5)
      expect(r.ratio, `${REALMS[r.major]!.name} 的历练倍率落在设计区间之外`).toBeLessThan(2)
      // 闭关 = +150% 修速 = 2.5×,且期间不能历练 —— 专心该比出门快一点
      expect(r.ratio, `${REALMS[r.major]!.name}:历练不该快过闭关`).toBeLessThan(RETREAT_MULT)
    }
    // 「一模一样」不是修辞:三条线都只跟修速走,故任何两境比值相同。
    // 旧口径在这里是 ×1 → ×8984(真仙)的指数发散,这条正是防它回来。
    const first = rows[0]!.ratio
    for (const r of rows) expect(r.ratio).toBeCloseTo(first, 9)
  })

  it('② 界末圆满那道修为墙,单靠战斗也要十天以上', () => {
    for (const last of [8, 13, 17]) {
      const wallSecs = layerSeconds(last) * 2 // ×2 = WORLD_STEP_EXP_MULT,见 boundaryTribulation.spec
      const hours = wallSecs / BATTLE_EXP_SECS / battlesPerHour()
      console.log(`  ${REALMS[last]!.name}圆满的界膜墙:约 ${(hours / 24).toFixed(1)} 天全时战斗`)
      expect(hours / 24, `${REALMS[last]!.name} 的界膜墙被战斗刷穿得太快`).toBeGreaterThan(10)
    }
  })

  it('③ 前期:炼气期一场遭遇填不满一层 —— 连首领+涉险+福缘叠满也不行', () => {
    const layer0 = layerSeconds(0)
    expect(BATTLE_EXP_SECS / layer0).toBeLessThan(INSTANT_EXP_LAYER_CAP)
    const stackedSecs = BATTLE_EXP_SECS * 4 * 1.9 * 2 // 首领 ×4 · 涉险求机 ×1.9 · 福缘 ×2
    // 叠满的裸账会超过一层(3.3 层量级)—— 这正是封顶存在的理由
    expect(stackedSecs / layer0).toBeGreaterThan(1)
    // 结算侧:叠满也只给「不满一层」
    const capped = expFromSecs(expRequirement(0, 0), stackedSecs, 1, INSTANT_EXP_LAYER_CAP)
    expect(toNum(capped)).toBeCloseTo(toNum(expRequirement(0, 0)) * INSTANT_EXP_LAYER_CAP, 9)
  })

  it('④ 离线 N 场 = N 次单场(上限一并放大,不偷跑也不被封顶吃掉)', () => {
    const req = expRequirement(9, 5)
    const speed = 7
    const one = expFromSecs(req, BATTLE_EXP_SECS, speed, INSTANT_EXP_LAYER_CAP)
    const hundred = expFromSecs(req, BATTLE_EXP_SECS * 100, speed, INSTANT_EXP_LAYER_CAP * 100)
    expect(toNum(hundred)).toBeCloseTo(toNum(one) * 100, 3)
  })

  it('⑤ 一把尺子:同一段时长在深境只更不值钱;修速翻倍则收益翻倍', () => {
    const shareAt = (major: number): number => Math.min(1, TYPICAL_EVENT_EXP_SECS / layerSeconds(major))
    expect(shareAt(MAX_MAJOR)).toBeLessThan(shareAt(5))
    const req = expRequirement(MAX_MAJOR, 5)
    const slow = expFromSecs(req, TYPICAL_EVENT_EXP_SECS, 10, INSTANT_EXP_LAYER_CAP)
    const fast = expFromSecs(req, TYPICAL_EVENT_EXP_SECS, 20, INSTANT_EXP_LAYER_CAP)
    expect(toNum(fast) / toNum(slow)).toBeCloseTo(2, 9)
  })

  it('⑥ 一次际遇 ≈ 五场遭遇;遭遇与际遇的次数加起来 = 每时 300 次', () => {
    expect(TYPICAL_EVENT_EXP_SECS / battleExpSecsAt()).toBeCloseTo(5, 9)
    expect(battlesPerHour() + eventsPerHour()).toBeCloseTo(encountersPerHour(), 9)
    expect(expIncomeAt(9).eventPerHour).toBeGreaterThan(0)
  })

  /**
   * 数据侧:所有际遇/机缘的修为奖励都落在同一档里(30~120 秒,即 2.5~10 场遭遇)。
   * 这条防的是"新写一个事件时随手给个很大的数"—— 单位的边界由数据守着,
   * 而不是靠下次有人记得去查。
   */
  it('事件数据:每一条际遇的修为都在 30~120 秒(2.5~10 场遭遇)', () => {
    const rows = [...EVENTS, ...CHAIN_EVENTS].flatMap(ev => ev.choices.flatMap(c => c.outcomes.flatMap(o => o.effects)))
    const secs = rows.filter(e => e.type === 'exp').map(e => e.secs)
    expect(secs.length, '一件带修为的事件都没有?那这条判据在守空气').toBeGreaterThan(20)
    for (const s of secs) {
      expect(s, `事件修为 ${s} 秒落在区间之外`).toBeGreaterThanOrEqual(30)
      expect(s, `事件修为 ${s} 秒落在区间之外`).toBeLessThanOrEqual(120)
    }
  })
})

/**
 * 接线红线 —— 算得对,还得**真的有人在用**。
 *
 * 这条读源码:四条即时修为来源(丹药 / 一场遭遇 / 离线 N 场 / 际遇)都必须走
 * formulas.expFromSecs。从前它们各写一遍「需求 × 百分比」,于是每一处都随境界
 * 指数膨胀 —— 只要有一处被漏回去,这里就红。
 */
describe('即时修为 · 同源接线', () => {
  const src = (p: string): string => readFileSync(resolve(__dirname, p), 'utf8')

  it('丹药 / 战斗 / 离线 / 际遇四条来源共用同一个结算函数', () => {
    for (const [file, why] of [
      ['./pillService.ts', '丹药'],
      ['./loot.ts', '一场遭遇'],
      ['./offline.ts', '离线 N 场'],
      ['./eventEngine.ts', '际遇与机缘']
    ] as const) {
      const text = src(file)
      expect(text, `${why} 没有走 expFromSecs —— 又在自己算百分比了`).toContain('expFromSecs(')
      expect(text, `${why} 里还留着「需求 × 百分比」的老写法`).not.toMatch(/mulN\(player\.expReq,/)
    }
  })
})
