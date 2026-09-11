/**
 * 战力五维评级审计
 *
 * powerRating 自 Phase 30.2 起就在代码里(进攻/生存/身法/恢复/机制),
 * 却一直没有界面在用 —— 等于没接线。接到流派页之后补上行为验证:
 * 星级要真的随词条形状分化,而不是人人一串三星。
 */
import { describe, expect, it } from 'vitest'
import { ratePower, ratingStars } from './powerRating'
import type { FinalStats, StatMods } from '@/types'

const statsWith = (mods: StatMods): FinalStats => ({ mods }) as FinalStats

describe('战力五维评级', () => {
  it('五个维度齐全、星级落在 1~5', () => {
    const r = ratePower(statsWith({}))
    expect(r.labels.map(l => l.name)).toEqual(['进攻', '生存', '身法', '恢复', '机制'])
    for (const l of r.labels) {
      expect(l.stars, `${l.name} 星级越界`).toBeGreaterThanOrEqual(1)
      expect(l.stars, `${l.name} 星级越界`).toBeLessThanOrEqual(5)
    }
  })

  it('星级随构筑形状分化:进攻堆叠抬高进攻星,守御堆叠抬高生存星', () => {
    const atk = ratePower(statsWith({ attackPct: 0.35, damageBonus: 0.2, critRate: 0.25, critDamage: 0.6, armorPen: 0.2 }))
    const def = ratePower(statsWith({ defensePct: 0.35, maxHpPct: 0.3, damageReduction: 0.25, shieldOnStart: 0.25, dodgeRate: 0.2 }))
    expect(atk.attack).toBeGreaterThan(def.attack)
    expect(def.survival).toBeGreaterThan(atk.survival)
  })

  it('恢复与身法各有各的轴,不互相冒充', () => {
    const heal = ratePower(statsWith({ lifesteal: 0.15, regenPerRound: 0.06, lowHpReduction: 0.3 }))
    const swift = ratePower(statsWith({ speed: 0.3, firstStrike: 0.3, comboRate: 0.2 }))
    expect(heal.recovery).toBeGreaterThan(swift.recovery)
    expect(swift.speed).toBeGreaterThan(heal.speed)
  })

  it('空构筑是低星而非零值;★ 串长度恒为 5', () => {
    const bare = ratePower(statsWith({}))
    expect(bare.attack).toBe(1)
    expect(bare.mechanics).toBe(1)
    for (const n of [-3, 0, 1, 3, 5, 9]) {
      const s = ratingStars(n)
      expect(s.length, `ratingStars(${n}) 长度`).toBe(5)
      expect(s).toMatch(/^[★]+[☆]*$/)
    }
    expect(ratingStars(0)).toBe('★☆☆☆☆')
    expect(ratingStars(9)).toBe('★★★★★')
  })
})
