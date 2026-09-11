import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useEndgameStore } from '@/stores/endgame'
import { FURNACE_RATES, DAO_SOURCE_PER_FRUIT } from '@/data/endgame'
import { challengeWorld, chooseDaoPath, condenseDaoFruit, currentDaoRules, endgameUnlocked, furnaceConvert } from './endgameService'
import { attemptBreakthrough } from './breakthrough'

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

  /**
   * 扩界后真仙不再是大道的尽头 —— 它只是仙界的门槛。
   * 这条守住「继续攀登」与「天界常开」两件事:门槛改锚后,上面还有境界可走,
   * 而终局内容在整个仙界/神界/混沌海期间始终可用(不因境界升高而关闭)。
   */
  it('真仙之上仍可继续攀登,且天界始终开启', () => {
    const player = usePlayerStore()
    ascend() // 至真仙(仙界门槛)
    expect(player.realm.name).toBe('真仙')
    expect(player.worldName).toBe('仙界')
    expect(endgameUnlocked()).toBe(true)

    // 从真仙沿真实突破继续推进(每大境界九层 + 跨境,共十步)
    let guard = 0
    while (!player.atMaxRealm && guard < 500) {
      player.advanceRealm()
      guard += 1
    }
    expect(player.atMaxRealm).toBe(true)
    expect(player.realm.name).toBe('混沌道祖')
    expect(player.worldName).toBe('混沌海')
    expect(endgameUnlocked()).toBe(true) // 越往高处走,天界只会更开,不会关
  })

  /**
   * 飞升是扩界新增的三次「换一片天」之一(另两次是入神、归返混沌)。
   * 渡劫→真仙不渡劫(飞升之赏),只按成功率判定;重试到成功为止(单次约 1/3,连败 200 次概率≈0),
   * 以此验明这条叙事与跨世节点真的落到存档里。
   */
  it('飞升真仙:记下跨世节点 first_immortal,并给出界域叙事', () => {
    const player = usePlayerStore()
    const resources = useResourcesStore()
    const endgame = useEndgameStore()
    player.major = 8 // 渡劫圆满,下一步即飞升
    player.sub = 9

    let view = null as ReturnType<typeof attemptBreakthrough>
    for (let i = 0; i < 200 && !view?.success; i += 1) {
      player.exp = player.expReq
      resources.setQi(player.qiCapValue, player.qiCapValue)
      view = attemptBreakthrough()
    }

    expect(view?.success).toBe(true)
    expect(player.major).toBe(9)
    expect(player.realm.name).toBe('真仙')
    expect(endgame.milestones.some(m => m.id === 'first_immortal')).toBe(true)
    expect(view?.message).toContain('仙界')
    // 大关进阶时附上该境出处(可解释性):真仙取道教仙阶
    expect(view?.message).toContain('道教仙阶')
  })
})
