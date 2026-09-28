/**
 * 重铸可洗性 —— 「锁了但没到上限还能不能继续洗」
 *
 * 玩家最自然的一句疑问:锁定只是为了保底,又没说这件就此不许洗。
 * 判据只有一条:**锁定数 < 该品质的词条条数上限**。
 * 不是「还有没有未锁定的词条」—— 上限 7 条的件锁了 6 条就该还能接着洗;
 * 也不是「离品质条数上限还差几条」—— 条数没到上限从来不构成不能洗的理由。
 *
 * 本文件把判据钉住:
 *   一 锁定数未达上限就能洗,哪怕当前一条未锁定的都没有;
 *   二 锁满上限才真的洗不动,解一条立刻恢复;
 *   三 重铸后条数落在品质区间内,**锁定数不变**(锁住的一条都不少),
 *      且不以「锁定数 + 1」为下限 —— 否则必涨一条、涨满即死;
 *   四 界面上「已锁定 N/M」的 M 取的是品质上限,不是当前条数。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reforgeCost, reforgeEquipment, reforgeAffixCap, lockCapacity, toggleAffixLock } from './reforge'
import { qualityDef } from '@/data/qualities'
import { rng } from '@/utils/random'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { gn } from '@/utils/gnum'
import type { EquipmentInstance } from '@/types'

/** 玄品 3~5 条(上限 5):够装下「锁 1~5 条、仍有可洗余地」的全部情形 */
function mk(uid: string, opts: Partial<EquipmentInstance> = {}): EquipmentInstance {
  return {
    uid,
    templateId: 'w_zhuqing',
    quality: 'profound',
    tier: 3,
    level: 0,
    affixes: [
      { id: 'atk1', roll: 0.5 },
      { id: 'def1', roll: 0.5 },
      { id: 'hp1', roll: 0.5 },
      { id: 'crit1', roll: 0.5 }
    ],
    ...opts
  }
}

function stock(uid: string, opts?: Partial<EquipmentInstance>): EquipmentInstance {
  useInventoryStore().items = [mk(uid, opts)]
  const res = useResourcesStore()
  res.addStone(gn(1e30))
  res.addSmall('dust', 1e6)
  return useInventoryStore().findItem(uid)!
}

describe('重铸可洗性 · 判据是「锁定数 vs 品质上限」', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('上限口径取自品质表,不在代码里写死数字', () => {
    expect(reforgeAffixCap(mk('cap')), '玄品上限 = 4 + 1 = 5').toBe(qualityDef('profound').affixes[1])
    expect(reforgeAffixCap(mk('cap', { quality: 'heaven' })), '天品上限 7').toBe(7)
    expect(reforgeAffixCap(mk('cap', { quality: 'mortal' })), '凡品上限 1').toBe(1)
  })

  it('锁 1 条:仍可重铸,成本只按锁定数上浮', () => {
    const base = stock('a')
    const baseCost = reforgeCost(base)!
    toggleAffixLock('a', 'atk1')
    const locked = useInventoryStore().findItem('a')!
    const after = reforgeCost(locked)
    expect(after, '锁 1 条远未到上限,必须还能洗').not.toBeNull()
    expect(after!.dust, '锁一条要贵一点').toBeGreaterThan(baseCost.dust)
  })

  it('当前一条未锁定的也没有,只要没到上限就仍可重铸', () => {
    // 这是玩家报的 case:天品上限 7,一件 6 条且 6 条全锁,按钮消失。
    // 旧判据按「未锁定词条数」算,这里必然为 0 → 洗不动;新判据 6 < 7 → 仍可洗。
    const inst = stock('six', {
      quality: 'heaven',
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 },
        { id: 'hp1', roll: 0.5 },
        { id: 'crit1', roll: 0.5 },
        { id: 'atk2', roll: 0.5 },
        { id: 'def2', roll: 0.5 }
      ],
      sealedAffixIds: ['atk1', 'def1', 'hp1', 'crit1', 'atk2', 'def2']
    })
    expect(reforgeAffixCap(inst)).toBe(7)
    expect(inst.affixes.filter(a => !(inst.sealedAffixIds ?? []).includes(a.id)), '确实没有未锁定的').toHaveLength(0)
    expect(reforgeCost(inst), '锁 6 条未达上限 7,仍能洗').not.toBeNull()
    expect(reforgeEquipment('six')).toBe(true)
    const after = useInventoryStore().findItem('six')!
    expect(after.sealedAffixIds, '锁定的 6 条一条不少').toHaveLength(6)
    expect(after.affixes.length, '重铸后条数仍落在品质区间内').toBeGreaterThanOrEqual(4)
    expect(after.affixes.length).toBeLessThanOrEqual(7)
    // 新掷出来的那条默认不锁,于是判据仍为真 —— 能一直洗下去
    expect(reforgeCost(after), '新词条不锁就仍能洗').not.toBeNull()
  })

  it('锁满上限才真的洗不动;解一条立刻恢复', () => {
    stock('c', {
      quality: 'profound', // 上限 5
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 },
        { id: 'hp1', roll: 0.5 },
        { id: 'crit1', roll: 0.5 },
        { id: 'atk2', roll: 0.5 }
      ]
    })
    for (const id of ['atk1', 'def1', 'hp1', 'crit1', 'atk2']) toggleAffixLock('c', id)
    const full = useInventoryStore().findItem('c')!
    expect(lockCapacity(full), '没有可锁的了').toBe(0)
    expect(reforgeCost(full), '锁满 5 条 = 撞上限,洗不动').toBeNull()
    expect(reforgeEquipment('c'), '锁满时重铸应被拒').toBe(false)
    toggleAffixLock('c', 'atk2')
    expect(reforgeCost(useInventoryStore().findItem('c')!), '解一条即可重铸').not.toBeNull()
  })

  it('条数天花板不是"不能洗的理由":未达品质上限照样洗', () => {
    // 神品 6~9 条,但这一件只有 2 条:离上限还差得远
    const inst = stock('d', { quality: 'divine', affixes: [{ id: 'atk1', roll: 0.5 }, { id: 'def1', roll: 0.5 }] })
    const [min, max] = qualityDef('divine').affixes
    expect(inst.affixes.length).toBeLessThan(max)
    expect(reforgeCost(inst), '离品质上限还远,当然能洗').not.toBeNull()
    expect(reforgeEquipment('d')).toBe(true)
    const after = useInventoryStore().findItem('d')!
    expect(after.affixes.length, '重铸后条数落到品质区间内').toBeGreaterThanOrEqual(min)
    expect(after.affixes.length).toBeLessThanOrEqual(max)
  })

  it('条数下限取「锁定数」而非「锁定数 + 1」:不会每次必涨一条', () => {
    // 回归:若下限仍是 kept.length + 1,天品锁 6 条会被强制掷到 7 条,
    // 于是每次点重铸必涨一条,涨满上限 7 就锁死(7 < 7 为假)—— 平白丢掉
    // 「维持 6 条只换数值」的能力。把条数掷到下限,验证不会被动涨到上限。
    const inst = stock('e', {
      quality: 'heaven',
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 },
        { id: 'hp1', roll: 0.5 },
        { id: 'crit1', roll: 0.5 },
        { id: 'atk2', roll: 0.5 },
        { id: 'def2', roll: 0.5 }
      ],
      sealedAffixIds: ['atk1', 'def1', 'hp1', 'crit1', 'atk2', 'def2']
    })
    expect(inst.affixes.length, '前置:6 条全锁').toBe(6)
    expect(reforgeAffixCap(inst), '前置:天品上限 7').toBe(7)
    vi.spyOn(rng, 'int').mockReturnValue(4) // 天品下限
    expect(reforgeEquipment('e')).toBe(true)
    const after = useInventoryStore().findItem('e')!
    expect(after.affixes.length, '掷到下限 4,但锁定 6 条都在,故仍为 6 条').toBe(6)
    expect(after.sealedAffixIds).toHaveLength(6)
    expect(reforgeCost(after), '6 < 7,还能继续洗').not.toBeNull()
  })

  it('锁定与条数变化互不干扰:重铸后还能继续锁新词条', () => {
    stock('f', { quality: 'divine', affixes: [{ id: 'atk1', roll: 0.5 }, { id: 'def1', roll: 0.5 }] })
    toggleAffixLock('f', 'atk1')
    reforgeEquipment('f')
    const after = useInventoryStore().findItem('f')!
    expect(after.sealedAffixIds).toEqual(['atk1'])
    const free = after.affixes.filter(a => a.id !== 'atk1')
    expect(free.length, '重铸后仍有未锁定的词条').toBeGreaterThan(0)
    expect(lockCapacity(after), '新词条可以再锁').toBe(free.length)
    const target = free[0]!.id
    expect(toggleAffixLock('f', target), '新词条必须锁得上').toBe(true)
    // 灵石是 1e30 量级,单次锁定费被浮点舍入吃掉 —— 断言「锁上了」而不是「扣了钱」
    expect(useInventoryStore().findItem('f')!.sealedAffixIds).toContain(target)
    expect(useInventoryStore().findItem('f')!.sealedAffixIds).toHaveLength(2)
  })
})
