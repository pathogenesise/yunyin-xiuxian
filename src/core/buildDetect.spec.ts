import { describe, expect, it } from 'vitest'
import { BUILD_STYLES, detectBuild } from './buildDetect'

describe('流派识别(Build 面板数据层)', () => {
  it('无相关词条时不识别', () => {
    expect(detectBuild({})).toBeNull()
    expect(detectBuild({ attackPct: 0.5, critRate: 0.1 })).toBeNull()
  })

  it('罡盾构筑被正确识别并给出契合度', () => {
    const d = detectBuild({ shieldOnStart: 0.2, shieldPower: 0.25, attackPct: 0.3 })
    expect(d).not.toBeNull()
    expect(d!.style.id).toBe('gangdun')
    expect(d!.affinity).toBeGreaterThan(0.6)
    expect(d!.stageName).toBe('成形')
    expect(d!.coreValues.length).toBe(2)
  })

  it('多路数并存时取契合度最高者', () => {
    const d = detectBuild({ lowHpDamage: 0.5, lowHpReduction: 0.3, comboRate: 0.1 })
    expect(d!.style.id).toBe('beishui')
    expect(d!.stageName).toBe('大成')
  })

  it('雏形阈值:低于 25% 契合不显示', () => {
    expect(detectBuild({ comboRate: 0.05 })).toBeNull()
    const d = detectBuild({ comboRate: 0.3 })
    expect(d!.style.id).toBe('lianji')
    expect(d!.stageName).toBe('雏形')
  })

  it('混合流派:主副体系并存,展示复合名号', () => {
    const d = detectBuild({
      shieldOnStart: 0.25,
      shieldPower: 0.3,
      counterRate: 0.15,
      counterDamage: 0.25
    })!
    expect(d.style.id).toBe('gangdun')
    expect(d.secondary?.style.id).toBe('fanzhen')
    expect(d.displayName).toBe('罡盾·反震')
  })

  it('纯派不显示副体系', () => {
    const d = detectBuild({ shieldOnStart: 0.25, shieldPower: 0.3 })!
    expect(d.secondary).toBeUndefined()
    expect(d.displayName).toBe('罡盾流')
  })

  it('六大流派定义完整且核心词条均有参考值', () => {
    expect(BUILD_STYLES.length).toBe(6)
    for (const s of BUILD_STYLES) {
      expect(Object.keys(s.core).length).toBeGreaterThan(1)
      expect(s.seal.length).toBe(1)
    }
  })
})
