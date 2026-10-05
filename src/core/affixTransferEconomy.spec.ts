/* eslint-disable no-console -- 对账表是给人看的 */
/**
 * 词条转移 · 定价对账(议题 #22)
 *
 * 转移价 = TRANSFER_PRICE_RATE × 「在目标件上保留其余词条、把这一条洗出来」的期望花费。
 * 期望次数由 reforge.expectedRollsToHit 解析求得 —— 它是照着重铸规则推出来的一阶近似,
 * 所以这里用**真的** reforgeEquipment 洗几千次来对账,两条判据:
 *
 *   ① 解析式 ÷ 实测次数 ∈ [0.8, 1.25] —— 重铸的条数规则或抽取权重一改,这条先红;
 *   ② 转移价 ÷ 实测洗出花费 ∈ [0.4, 1.1] —— 尘与灵石各量一遍。「洗出花费」是这几千次重铸
 *      **真扣的**尘与灵石(每次按 reforgeCost 记账)除以命中次数,不是拿公式再推一遍 ——
 *      否则重铸定价一改,两边的同一个因子相消,判据就跟着一起错。
 *
 * 故障注入(docs/审计规范.md):
 *   · reforge 抽取权重 `a => a.weight` 改成 `() => 1` → ① 红(解析式仍按权重算);
 *   · TRANSFER_PRICE_RATE 0.6 → 0.3 → 只有 ② 红;
 *   · reforgeCost 的尘价改成不随封存涨(`dust: REFORGE_DUST_BASE`)→ ② 红(保留 6 条那例尘比约 2.6)。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// 钉死随机源:对账要可重放
vi.mock('@/utils/random', async orig => {
  const mod = await orig<typeof import('@/utils/random')>()
  return { ...mod, rng: new mod.RandomService(mod.mulberry32(9001)) }
})
// 计数与见闻和定价无关,桩掉提速(一次重铸从约 1ms 降到约 0.1ms)
vi.mock('./progress', async orig => ({ ...(await orig<typeof import('./progress')>()), track: () => undefined }))
vi.mock('./loreService', async orig => ({ ...(await orig<typeof import('./loreService')>()), noteSmithingUsed: () => undefined }))

import { planTransfer } from './affixTransfer'
import { expectedRollsToHit, reforgeCost, reforgeEquipment } from './reforge'
import { add, gn, gnZero } from '@/utils/gnum'
import { useInventoryStore } from '@/stores/inventory'
import { useResourcesStore } from '@/stores/resources'
import type { EquipmentInstance, GNum } from '@/types'

interface Case {
  label: string
  templateId: string
  quality: EquipmentInstance['quality']
  /** 目标上保留(重铸时封存)的条 */
  kept: string[]
  /** 要洗出 / 转入的那一条 */
  want: string
  /** 一条不封的填充,给重铸留一个可重掷位 */
  filler: string
}

const CASES: Case[] = [
  { label: '天品武器 保留 0 → 洞虚', templateId: 'w_hanfeng', quality: 'heaven', kept: [], want: 'pen3', filler: 'atk1' },
  { label: '天品武器 保留 3 → 碎甲', templateId: 'w_hanfeng', quality: 'heaven', kept: ['atk1', 'def1', 'hp1'], want: 'pen2', filler: 'cult1' },
  { label: '灵品戒指 保留 2 → 锐目', templateId: 'r_tongjie', quality: 'spirit', kept: ['atk1', 'luck1'], want: 'crit2', filler: 'def1' },
  { label: '神品武器 保留 6 → 破军', templateId: 'w_hanfeng', quality: 'divine', kept: ['atk1', 'def1', 'hp1', 'cult1', 'gain1', 'spd1'], want: 'atk2', filler: 'dmg1' }
]

/** 每例真重铸的次数:足够让命中数上百,均值误差在一成以内 */
const ROLLS = 6000

const toNum = (g: GNum): number => g.m * Math.pow(10, g.e)

interface Measured {
  /** 平均几次洗出一回 */
  rolls: number
  /** 平均洗出一回真扣的尘 */
  dustPerHit: number
  /** 平均洗出一回真扣的灵石 */
  stonePerHit: number
}

/** 封着 kept 洗 ROLLS 次,数出 want 出现的次数,并照 reforgeCost 记下每一次真扣的尘与灵石 */
function measure(c: Case): Measured {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const item: EquipmentInstance = {
    uid: 'eco',
    templateId: c.templateId,
    quality: c.quality,
    tier: 20,
    level: 0,
    affixes: [...c.kept, c.filler].map(id => ({ id, roll: 0.5 })),
    sealedAffixIds: [...c.kept]
  }
  inventory.items = [item]
  resources.spiritStone = gn(1e300)
  resources.dust = 1e12
  let hits = 0
  let dust = 0
  // 余额是 1e300,做差会被大数精度吞掉 —— 花费单独累加
  let stone = gnZero()
  for (let i = 0; i < ROLLS; i += 1) {
    const cost = reforgeCost(inventory.findItem('eco')!)!
    dust += cost.dust
    stone = add(stone, cost.stone)
    reforgeEquipment('eco', true)
    if (inventory.findItem('eco')!.affixes.some(a => a.id === c.want)) hits += 1
  }
  expect(hits, `${c.label}:${ROLLS} 次一条都没洗出来,对账没跑到东西`).toBeGreaterThan(50)
  return { rolls: ROLLS / hits, dustPerHit: dust / hits, stonePerHit: toNum(stone) / hits }
}

describe('词条转移 · 定价与真重铸对账', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('① 解析期望次数 ÷ 实测 ∈ [0.8, 1.25];② 转移价 ÷ 实测洗出花费 ∈ [0.4, 1.1](尘、灵石各一)', () => {
    console.log('\n  例子                         解析   实测   比值   尘比  灵石比')
    for (const c of CASES) {
      const m = measure(c)
      const analytic = expectedRollsToHit({ uid: 'x', templateId: c.templateId, quality: c.quality, tier: 20, level: 0, affixes: [] }, c.want, c.kept)
      const ratio = analytic / m.rolls
      // 转移计划:目标上恰好是 kept 这几条,新增 want —— 与「封着 kept 洗出 want」同一处境
      const src: EquipmentInstance = { uid: 'src', templateId: c.templateId, quality: c.quality, tier: 20, level: 0, affixes: [{ id: c.want, roll: 0.9 }] }
      const tgt: EquipmentInstance = { uid: 'tgt', templateId: c.templateId, quality: c.quality, tier: 20, level: 0, affixes: c.kept.map(id => ({ id, roll: 0.5 })) }
      const plan = planTransfer(src, tgt, c.want, null, false)
      expect(plan.ok, c.label).toBe(true)
      if (!plan.ok) continue
      const dustBand = plan.plan.cost.dust / m.dustPerHit
      const stoneBand = toNum(plan.plan.cost.stone) / m.stonePerHit
      console.log(
        `  ${c.label.padEnd(22)} ${analytic.toFixed(1).padStart(6)} ${m.rolls.toFixed(1).padStart(6)} ${ratio.toFixed(2).padStart(6)} ${dustBand.toFixed(2).padStart(6)} ${stoneBand.toFixed(2).padStart(6)}`
      )
      expect(ratio, `${c.label}:解析式与真重铸对不上(重铸规则改了?)`).toBeGreaterThanOrEqual(0.8)
      expect(ratio, `${c.label}:解析式与真重铸对不上(重铸规则改了?)`).toBeLessThanOrEqual(1.25)
      for (const [what, band] of [
        ['尘', dustBand],
        ['灵石', stoneBand]
      ] as const) {
        expect(band, `${c.label}:转移的${what}价偏离真实洗出花费的 0.4~1.1 倍`).toBeGreaterThanOrEqual(0.4)
        expect(band, `${c.label}:转移的${what}价偏离真实洗出花费的 0.4~1.1 倍`).toBeLessThanOrEqual(1.1)
      }
    }
  })
})
