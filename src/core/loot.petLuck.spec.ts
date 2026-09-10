/**
 * 灵兽性格 · 掉落倾向(dropLuck 接入 afterWin)
 *
 * 贪宝型灵兽应「更易发现稀有之物」,谨慎型「掉落稍稍寻常」—— 这是
 * petPersonality 与图鉴性格说明向玩家做出的承诺。此前 dropLuck 从未接入
 * 掉落结算:afterWin 的品质 luck 只来自装备/天赋等 mods,与性格无关。
 * 本测试用 mock 的 equipGen 捕获传入的品质 luck,证明接线已生效。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { regionDef } from '@/data/regions'
import { afterWin } from './loot'
import { generateEquipment } from './equipGen'

vi.mock('./equipGen', async importOriginal => {
  const mod = await importOriginal<typeof import('./equipGen')>()
  return {
    ...mod,
    generateEquipment: vi.fn(() => ({
      uid: 'pet-spec',
      templateId: 'w_iron',
      quality: 'mortal',
      tier: 1,
      level: 0,
      affixes: []
    }))
  }
})

import { usePlayerStore } from '@/stores/player'

describe('灵兽性格 · 掉落倾向(dropLuck 接入 afterWin)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(generateEquipment).mockClear()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 压掉杂项掉落,只留 boss 必掉的那件
  })

  function seedPet(petId: string | null): void {
    const player = usePlayerStore()
    player.initCharacter('拾珍', { roots: [] } as never)
    if (petId) player.setPet(petId)
  }

  it('贪宝灵兽把性格倾向并入装备品质 luck', () => {
    seedPet('pet_qingyu') // greedy → dropLuck 0.06,自身 mods 不带 luck
    const region = regionDef('qingyun')!
    afterWin(region, 1, true)

    const call = vi.mocked(generateEquipment).mock.calls.at(-1)!
    const kwargs = call[2] as { luck: number; minQualityRank: number } | undefined
    expect(kwargs?.luck).toBeCloseTo(0.06)
  })

  it('无灵兽时品质 luck 不着性格加成', () => {
    seedPet(null)
    const region = regionDef('qingyun')!
    afterWin(region, 1, true)

    const call = vi.mocked(generateEquipment).mock.calls.at(-1)!
    const kwargs = call[2] as { luck: number; minQualityRank: number } | undefined
    expect(kwargs?.luck).toBe(0)
  })

  it('谨慎灵兽(dropLuck 为负)拉低品质 luck', () => {
    seedPet('pet_yueying') // cautious → dropLuck -0.02,自身 mods 不带 luck
    const region = regionDef('qingyun')!
    afterWin(region, 1, true)

    const call = vi.mocked(generateEquipment).mock.calls.at(-1)!
    const kwargs = call[2] as { luck: number; minQualityRank: number } | undefined
    expect(kwargs?.luck).toBeCloseTo(-0.02)
  })
})
