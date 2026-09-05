/**
 * 玩家行为生态裁判(Phase 27)
 * 今日天道:同日必同题、定价有界;构筑对照:同构筑对照自身差异必为零(测量无系统偏差)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BUILD_PROFILES, buildSnap } from './buildSim'
import { compareSnaps } from './compare'
import { todayChallenge } from './dailyChallenge'

describe('今日天道', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('同一日两次生成完全相同(刷新不换题),且定价有界', () => {
    const a = todayChallenge()
    const b = todayChallenge()
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a!.draft).toEqual(b!.draft)
    expect(a!.verdict.reward).toBe(b!.verdict.reward)
    expect(a!.verdict.reward).toBeGreaterThanOrEqual(30)
    expect(a!.verdict.reward).toBeLessThanOrEqual(90)
    expect(a!.verdict.ok).toBe(true)
  })
})

describe('构筑对照', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('同一构筑对照自身:四天档位全平、无过程差异(测量器无系统偏差)', () => {
    const snap = buildSnap(BUILD_PROFILES[1]!)
    const report = compareSnaps(snap, snap)
    for (const row of report.rows) {
      expect(row.trend, `${row.worldName} 自反对照不平`).toBe('flat')
      expect(row.aText).toBe(row.bText)
    }
    expect(report.diffLines.length, '自反对照出现过程差异').toBe(0)
  })

  it('不同构筑的对照给出至少一处环境差异或过程差异(对照有分辨力)', () => {
    const report = compareSnaps(
      buildSnap(BUILD_PROFILES.find(p => p.id === 'gangdun')!),
      buildSnap(BUILD_PROFILES.find(p => p.id === 'fengmang')!)
    )
    const hasDiff = report.rows.some(r => r.trend !== 'flat') || report.diffLines.length > 0
    expect(hasDiff).toBe(true)
  })
})
