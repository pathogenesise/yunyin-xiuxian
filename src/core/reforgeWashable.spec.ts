/**
 * 重铸可洗性 —— 「锁了但没到上限还能不能继续洗」
 *
 * 玩家最自然的一句疑问:锁定只是为了保底,又没说这件就此不许洗。
 * 本文件把判据钉住:
 *   一 只要还有**一条未锁定的**词条,就还能重铸(锁定不是封禁,只是保护);
 *   二 全部锁定才真的不能再炼,且解一条立刻恢复;
 *   三 重铸后条数落在品质区间内,锁定数不变,新词条补进未锁定那部分;
 *   四 「条数没到品质上限」与「能不能洗」无关 —— 上限只是条数天花板,不是开关。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reforgeCost, reforgeEquipment, lockCapacity, toggleAffixLock } from './reforge'
import { qualityDef } from '@/data/qualities'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { gn } from '@/utils/gnum'
import type { EquipmentInstance } from '@/types'

/** 玄品 3~4 条:够装下「锁 1~3 条、仍有可重掷位」的全部情形 */
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

describe('重铸可洗性 · 锁定是保护不是封禁', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('锁 1 条:仍可重铸,成本只按锁定数上浮', () => {
    const base = stock('a')
    const baseCost = reforgeCost(base)!
    toggleAffixLock('a', 'atk1')
    const locked = useInventoryStore().findItem('a')!
    const after = reforgeCost(locked)
    expect(after, '还有三条未锁定,必须还能洗').not.toBeNull()
    expect(after!.dust, '锁一条要贵一点').toBeGreaterThan(baseCost.dust)
  })

  it('锁到只剩一条未锁定:仍可重铸(那一条会被掷掉换新)', () => {
    stock('b')
    for (const id of ['atk1', 'def1', 'hp1']) toggleAffixLock('b', id)
    const inst = useInventoryStore().findItem('b')!
    expect(lockCapacity(inst), '4 条锁 3 条,还剩 1 条可锁').toBe(1)
    expect(reforgeCost(inst), '还剩一条未锁定,仍能洗').not.toBeNull()
    expect(reforgeEquipment('b')).toBe(true)
    const after = useInventoryStore().findItem('b')!
    expect(after.sealedAffixIds, '锁定的三条一条不少').toEqual(['atk1', 'def1', 'hp1'])
    const [min, max] = qualityDef('profound').affixes
    // 重铸会「至少补一条新的」,故下限是 max(品质下限, 锁定数+1)
    expect(after.affixes.length, '条数仍按品质区间').toBeGreaterThanOrEqual(Math.max(min, 4))
    expect(after.affixes.length).toBeLessThanOrEqual(max)
  })

  it('全部锁定:真的不能炼了;解一条立刻恢复', () => {
    stock('c')
    for (const id of ['atk1', 'def1', 'hp1', 'crit1']) toggleAffixLock('c', id)
    const all = useInventoryStore().findItem('c')!
    expect(lockCapacity(all), '没有可锁的了').toBe(0)
    expect(reforgeCost(all), '全锁后没有可重掷位').toBeNull()
    expect(reforgeEquipment('c'), '全锁后重铸应被拒').toBe(false)
    toggleAffixLock('c', 'crit1')
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

  it('锁定与条数变化互不干扰:重铸后还能继续锁新词条', () => {
    stock('e', { quality: 'divine', affixes: [{ id: 'atk1', roll: 0.5 }, { id: 'def1', roll: 0.5 }] })
    toggleAffixLock('e', 'atk1')
    reforgeEquipment('e')
    const after = useInventoryStore().findItem('e')!
    expect(after.sealedAffixIds).toEqual(['atk1'])
    const free = after.affixes.filter(a => a.id !== 'atk1')
    expect(free.length, '重铸后仍有未锁定的词条').toBeGreaterThan(0)
    expect(lockCapacity(after), '新词条可以再锁').toBe(free.length)
    const target = free[0]!.id
    expect(toggleAffixLock('e', target), '新词条必须锁得上').toBe(true)
    // 灵石是 1e30 量级,单次锁定费被浮点舍入吃掉 —— 断言「锁上了」而不是「扣了钱」
    expect(useInventoryStore().findItem('e')!.sealedAffixIds).toContain(target)
    expect(useInventoryStore().findItem('e')!.sealedAffixIds).toHaveLength(2)
  })
})
