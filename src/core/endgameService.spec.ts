import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useEndgameStore } from '@/stores/endgame'
import { FURNACE_RATES, DAO_SOURCE_PER_FRUIT } from '@/data/endgame'
import { challengeWorld, chooseDaoPath, condenseDaoFruit, currentDaoRules, endgameUnlocked, furnaceConvert } from './endgameService'

function ascend(): void {
  const player = usePlayerStore()
  // (0,0) → (9,x):每个大境界需 10 次推进(九层 + 跨境)
  for (let i = 0; i < 95; i += 1) player.advanceRealm()
}

describe('真仙终局服务', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('未至真仙不得踏天', () => {
    expect(endgameUnlocked()).toBe(false)
    expect(chooseDaoPath('sword')).toBe(false)
    expect(challengeWorld('chiyan')).toBeNull()
  })

  it('道途一生一诺,规则随身', () => {
    ascend()
    expect(chooseDaoPath('slaughter')).toBe(true)
    expect(chooseDaoPath('sword')).toBe(false) // 已定,不可另择
    const rules = currentDaoRules()
    expect(rules?.playerAtkMult).toBe(1.25)
    expect(rules?.maxRounds).toBe(35)
  })

  it('天道熔炉:闲置资源熔作道源,余数保留', () => {
    ascend()
    const resources = useResourcesStore()
    const endgame = useEndgameStore()
    resources.addSmall('ore', 130)
    const rate = FURNACE_RATES.find(r => r.resource === 'ore')!
    const gained = furnaceConvert(rate) // 130/25 = 5 缕
    expect(gained).toBe(5)
    expect(endgame.daoSource).toBe(5)
    expect(resources.ore).toBe(5) // 余数保留
  })

  it('道源凝道果:走既有软上限体系', () => {
    ascend()
    const endgame = useEndgameStore()
    const player = usePlayerStore()
    endgame.addDaoSource(DAO_SOURCE_PER_FRUIT)
    expect(condenseDaoFruit()).toBe(true)
    expect(player.reincarnation.daoFruit).toBe(1)
    expect(condenseDaoFruit()).toBe(false) // 道源不足
  })

  it('远征世界:扣道源、出战报、留道痕', () => {
    ascend()
    const endgame = useEndgameStore()
    chooseDaoPath('slaughter')
    endgame.addDaoSource(20)
    const result = challengeWorld('chiyan')
    expect(result).not.toBeNull()
    expect(result!.report.rows.length).toBeGreaterThan(0)
    expect(endgame.marks.length).toBe(1)
    expect(endgame.marks[0]!.daoPathId).toBe('slaughter')
    // 道源已扣(无论胜负);胜则有赏
    if (result!.report.cleared) {
      expect(endgame.daoSource).toBe(60)
    } else {
      expect(endgame.daoSource).toBe(0)
    }
  })

  it('未择道途不可远征', () => {
    ascend()
    const endgame = useEndgameStore()
    endgame.addDaoSource(50)
    expect(challengeWorld('chiyan')).toBeNull()
    expect(endgame.daoSource).toBe(50) // 未扣费
  })
})
