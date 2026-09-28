/* eslint-disable no-console -- 成本表是给人看的 */
/**
 * 重铸与封存 —— 成本只看「阶数」与「封存数」,重铸连条数一起重掷
 *
 * 旧口径是「品质倍率 × 1.5^次数,上限 10 次」。两处都换掉了:
 *   一 **不限次数**:能不能继续炼,不该由一个与装备无关的计数器决定;
 *   二 **成本只随两件事走**:它有多高阶(与强化/封存同一条 stoneByTier 经济)、
 *      你封存了几个词条(封存是保护,保护得越多,重掷剩下部分越贵)。
 * 而「重铸」的动作也换了:旧版只**换掉一条**词条、条数不动;现在把未封存的
 * 词条推倒重来 —— **条数按品质区间重掷**(至少给一条新的),数值全部重掷。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { reforgeCost, reforgeEquipment, lockCapacity, lockCost, toggleAffixLock } from './reforge'
import { REFORGE_DUST_BASE, REFORGE_SEAL_LOAD, REFORGE_STONE_BASE } from '@/data/constants'
import { qualityDef } from '@/data/qualities'
import { rng } from '@/utils/random'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import { gn } from '@/utils/gnum'
import type { EquipmentInstance } from '@/types'

const stoneOf = (g: { m: number; e: number }): number => g.m * Math.pow(10, g.e)

const base: EquipmentInstance = {
  uid: 'u1',
  templateId: 'w_zhuqing',
  quality: 'excellent',
  tier: 3,
  level: 0,
  affixes: [
    { id: 'atk1', roll: 0.5 },
    { id: 'def1', roll: 0.5 }
  ],
  reforgeCount: 0
}

describe('重铸成本 · 只看阶数与封存数', () => {
  it('不限次数:洗到第两百次仍可重铸,且价格与第一次相同', () => {
    const first = reforgeCost({ ...base, reforgeCount: 0 })!
    const late = reforgeCost({ ...base, reforgeCount: 200 })!
    expect(late, '不该再有次数上限').not.toBeNull()
    expect(stoneOf(late.stone), '次数不进公式').toBeCloseTo(stoneOf(first.stone), 6)
    expect(late.dust).toBe(first.dust)
  })

  it('品质不进公式:凡品与神品洗一次同价(贵贱由阶数与封存数说)', () => {
    const mortal = reforgeCost({ ...base, quality: 'mortal' })!
    const divine = reforgeCost({ ...base, quality: 'divine' })!
    expect(stoneOf(divine.stone)).toBeCloseTo(stoneOf(mortal.stone), 6)
  })

  it('阶数定价:灵石 = stoneByTier(阶) × 基础,与强化同一条经济', () => {
    const t3 = reforgeCost({ ...base, tier: 3 })!
    const t10 = reforgeCost({ ...base, tier: 10 })!
    console.log(`\n  重铸灵石:3 阶 ${stoneOf(t3.stone).toExponential(2)} → 10 阶 ${stoneOf(t10.stone).toExponential(2)}`)
    expect(stoneOf(t10.stone)).toBeGreaterThan(stoneOf(t3.stone) * 5)
    // 未封存时正好是「基础 × 阶数倍率」
    const t3NoSeal = reforgeCost({ ...base, tier: 3 })!
    expect(t3NoSeal.dust).toBe(REFORGE_DUST_BASE)
    expect(REFORGE_STONE_BASE).toBeGreaterThan(0)
  })

  it('封存溢价:每封一条,灵石与器灵尘各上浮 REFORGE_SEAL_LOAD', () => {
    const three = { ...base, affixes: [...base.affixes, { id: 'hp1', roll: 0.5 }] }
    const one = reforgeCost({ ...three, sealedAffixIds: ['atk1'] })!
    const two = reforgeCost({ ...three, sealedAffixIds: ['atk1', 'def1'] })!
    expect(stoneOf(two.stone) / stoneOf(one.stone)).toBeCloseTo((1 + 2 * REFORGE_SEAL_LOAD) / (1 + REFORGE_SEAL_LOAD), 6)
    expect(two.dust).toBe(Math.round(REFORGE_DUST_BASE * (1 + 2 * REFORGE_SEAL_LOAD)))
  })

  it('全部锁定就没得重铸了 —— 这是唯一一种"不能再炼"', () => {
    expect(reforgeCost({ ...base, sealedAffixIds: ['atk1', 'def1'] })).toBeNull()
    expect(lockCapacity(base), '未锁定时两条都还能锁').toBe(2)
    expect(lockCapacity({ ...base, sealedAffixIds: ['atk1'] }), '锁 1 条后还剩 1 条').toBe(1)
    // 全部锁住后没有「不能再锁」这一说:只是不再有任何可锁的词条
    expect(lockCapacity({ ...base, sealedAffixIds: ['atk1', 'def1'] })).toBe(0)
    // 价格随已锁定数递增,解锁不另计灵石(故没有 unlockCost 这个入口)
    const after1 = stoneOf(lockCost({ ...base, sealedAffixIds: ['atk1'] }))
    const after2 = stoneOf(lockCost({ ...base, sealedAffixIds: ['atk1', 'def1'] }))
    expect(after2).toBeGreaterThan(after1)
  })
})

describe('重铸动作 · 条数与数值一起重掷', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  /** 摆一件装备与足够的资源(重铸要真扣账) */
  function setup(inst: EquipmentInstance): void {
    useInventoryStore().items = [inst]
    const res = useResourcesStore()
    res.addStone(gn(1e30))
    res.addSmall('dust', 100_000)
  }

  it('条数按品质区间重掷:上限拉满时,词条数真的变多', () => {
    const inst: EquipmentInstance = {
      ...base,
      uid: 'count-up',
      quality: 'profound', // 玄品:3~4 条
      affixes: [{ id: 'atk1', roll: 0.5 }]
    }
    setup(inst)
    // 让条数掷到上限、且新词条挑得出
    vi.spyOn(rng, 'int').mockReturnValue(qualityDef('profound').affixes[1])
    expect(reforgeEquipment('count-up')).toBe(true)
    const after = useInventoryStore().findItem('count-up')!
    expect(after.affixes.length).toBe(qualityDef('profound').affixes[1])
    expect(after.affixes.length).toBeGreaterThan(inst.affixes.length)
    expect(after.reforgeCount, '次数仍记着(只是不进公式)').toBe(1)
  })

  it('封存的原样保留,其余词条全部重掷(掷点重来)', () => {
    const inst: EquipmentInstance = {
      ...base,
      uid: 'sealed-keep',
      quality: 'profound',
      affixes: [
        { id: 'atk1', roll: 0.1 },
        { id: 'def1', roll: 0.2 },
        { id: 'hp1', roll: 0.3 }
      ],
      sealedAffixIds: ['atk1']
    }
    setup(inst)
    // 把新掷点钉成一个一眼可辨的值:未封存的那几条若还带着从前的 0.2/0.3,就说明没重掷
    vi.spyOn(rng, 'weighted').mockImplementation(((items: readonly unknown[]) => items[0]) as never)
    vi.spyOn(rng, 'next').mockReturnValue(0.99)
    expect(reforgeEquipment('sealed-keep')).toBe(true)
    const after = useInventoryStore().findItem('sealed-keep')!
    const kept = after.affixes.find(a => a.id === 'atk1')
    expect(kept, '封存的那条必须还在').toBeDefined()
    expect(kept!.roll, '封存的掷点不动').toBe(0.1)
    for (const a of after.affixes.filter(x => x.id !== 'atk1')) {
      expect(a.roll, `${a.id} 还是旧掷点,说明没重掷`).toBe(0.99)
    }
    const [min, max] = qualityDef('profound').affixes
    expect(after.affixes.length).toBeGreaterThanOrEqual(min)
    expect(after.affixes.length).toBeLessThanOrEqual(max)
    expect(new Set(after.affixes.map(a => a.id)).size, '同一件里不该有重复词条').toBe(after.affixes.length)
  })

  it('每次重铸至少给一条新的:封存到只剩一个位时也不会空转', () => {
    const inst: EquipmentInstance = {
      ...base,
      uid: 'one-slot',
      quality: 'excellent', // 精品 2~3 条
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 }
      ],
      sealedAffixIds: ['atk1']
    }
    setup(inst)
    expect(reforgeEquipment('one-slot')).toBe(true)
    const after = useInventoryStore().findItem('one-slot')!
    const [min, max] = qualityDef('excellent').affixes
    // 条数按品质区间重掷(精品 2~3),但封存的那条一定还在、且至少补一条新的
    expect(after.affixes.length).toBeGreaterThanOrEqual(min)
    expect(after.affixes.length).toBeLessThanOrEqual(max)
    expect(after.affixes.some(a => a.id === 'atk1')).toBe(true)
    expect(after.affixes.some(a => a.id !== 'atk1'), '至少要有一条新的').toBe(true)
  })

  it('不止一条可洗:一掷定一份词条构成,而不是只换一条', () => {
    const inst: EquipmentInstance = {
      ...base,
      uid: 'multi',
      quality: 'heaven', // 4~5 条
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 },
        { id: 'hp1', roll: 0.5 },
        { id: 'crit1', roll: 0.5 }
      ]
    }
    setup(inst)
    vi.spyOn(rng, 'int').mockReturnValue(qualityDef('heaven').affixes[1])
    reforgeEquipment('multi')
    const after = useInventoryStore().findItem('multi')!
    expect(after.affixes.length).toBe(qualityDef('heaven').affixes[1])
    expect(new Set(after.affixes.map(a => a.id)).size, '同一件里不该有重复词条').toBe(after.affixes.length)
  })

  it('资源不足时不动装备、不记账', () => {
    const inst: EquipmentInstance = { ...base, uid: 'poor' }
    useInventoryStore().items = [inst]
    expect(reforgeEquipment('poor')).toBe(false)
    expect(useInventoryStore().findItem('poor')!.reforgeCount).toBe(0)
  })

  it('锁定要付费,且再点一次可解除(不另计灵石)', () => {
    const inst: EquipmentInstance = { ...base, uid: 'lock' }
    useInventoryStore().items = [inst]
    const res = useResourcesStore()
    res.addStone(gn(1e30))
    expect(toggleAffixLock('lock', 'atk1')).toBe(true)
    expect(useInventoryStore().findItem('lock')!.sealedAffixIds).toEqual(['atk1'])
    const stoneAfterLock = res.spiritStone
    expect(toggleAffixLock('lock', 'atk1'), '再点一次应解除锁定').toBe(true)
    expect(useInventoryStore().findItem('lock')!.sealedAffixIds).toEqual([])
    expect(res.spiritStone, '解锁不收灵石').toEqual(stoneAfterLock)
  })

  it('锁到只剩一条可重掷时,那条也锁得上(不再强制留可重掷位)', () => {
    // 回归:旧规则要求「至少留一条可重掷」,于是「5 条锁 3 条 → 重铸后总数掉到 4 条」
    // 时第 4 条再也锁不上。现在不强制留位,全部锁住只是「不能再重铸」,那本就合法。
    const inst: EquipmentInstance = {
      ...base,
      uid: 'last-slot',
      quality: 'profound', // 玄品 3~4 条
      affixes: [
        { id: 'atk1', roll: 0.5 },
        { id: 'def1', roll: 0.5 },
        { id: 'hp1', roll: 0.5 },
        { id: 'crit1', roll: 0.5 }
      ],
      sealedAffixIds: ['atk1', 'def1', 'hp1']
    }
    useInventoryStore().items = [inst]
    useResourcesStore().addStone(gn(1e30))
    expect(lockCapacity(inst), '4 条锁 3 条,还剩 1 条可锁').toBe(1)
    expect(toggleAffixLock('last-slot', 'crit1'), '第 4 条必须锁得上').toBe(true)
    expect(useInventoryStore().findItem('last-slot')!.sealedAffixIds).toHaveLength(4)
    // 全部锁住之后:不能重铸,但仍可逐条解锁
    expect(reforgeCost(useInventoryStore().findItem('last-slot')!)).toBeNull()
    expect(toggleAffixLock('last-slot', 'crit1')).toBe(true)
    expect(reforgeCost(useInventoryStore().findItem('last-slot')!)).not.toBeNull()
  })
})

describe('界面与判定同源 · 条数上限不写死', () => {
  const dialog = readFileSync(resolve(__dirname, '../components/equipment/EquipmentDetailDialog.vue'), 'utf8')

  it('词条条数上限取自品质表,不在模板里写死数字', () => {
    expect(dialog, '上限应读 qualityDef(...).affixes[1]').toContain('qualityDef(inst.value.quality).affixes[1]')
    expect(dialog, '还能锁几条应读 lockCapacity(与判定同一处)').toContain('lockCapacity(')
    expect(dialog, '不该再出现「重铸次数 x/10」这类写死的分母').not.toMatch(/重铸次数\s*\{\{/)
  })

  it('界面写「锁定」而不是「封存」,并明说可解锁', () => {
    expect(dialog).toContain('锁定')
    expect(dialog, '锁错了要能解开,界面得说出来').toContain('解锁')
    expect(dialog, '模板里不该再留「封存」这个词').not.toContain('封存')
  })
})
