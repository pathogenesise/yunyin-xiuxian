/**
 * 远征 · 天机透视出发前「先算后战」的同源口径
 *
 * previewFight 是 fate 道的招牌「天机透视·入界之敌」:出发前预览应当用
 * 与首战完全相同的规则来算胜算(道途 × 世界 × 契约 × 奇门)。此前 run=null
 * 时只按 currentDaoRules() 预估,漏掉 world.rules 与所择契约/奇门 ——
 * 报的胜算比实况乐观一整档(赤炎天的回合上限、生机稀薄一概不报)。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { rng } from '@/utils/random'
import { celestialWorldDef } from '@/data/endgame'
import { useEndgameStore } from '@/stores/endgame'
import { previewFight } from './expedition'

describe('远征 · 天机透视出发前', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useEndgameStore().$patch({ daoPath: 'fate' })
  })

  it('赤炎天出发前:回合上限与生机稀薄都得报出来(与首战同一份世界规则)', () => {
    const world = celestialWorldDef('chiyan')!
    const pv = previewFight(world.foes[0]!, undefined, rng, { worldId: 'chiyan', pactId: null, gateId: null })
    expect(pv, '天机道应能看到预览').not.toBeNull()
    const risk = pv!.riskLines.join(';')
    expect(risk, '赤炎天 enemyAtkMult/maxRounds/healMult 世界规则都应体现在预警里').toContain('32 回合')
    expect(risk).toContain('生机稀薄')
  })

  it('契约也得算进预览:血契(回血归零)出发前就报凶险,不是开战才翻脸', () => {
    const world = celestialWorldDef('chiyan')!
    const pv = previewFight(world.foes[0]!, undefined, rng, { worldId: 'chiyan', pactId: 'xue', gateId: null })
    expect(pv).not.toBeNull()
    expect(pv!.riskLines.join(';')).toContain('生机稀薄')
  })
})
