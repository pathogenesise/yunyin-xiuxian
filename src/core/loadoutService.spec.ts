import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mulberry32, RandomService } from '@/utils/random'
import { generateEquipment } from './equipGen'
import { captureLoadout, applyLoadout } from './loadoutService'
import { equipmentTemplate } from '@/data/equipment'
import { useInventoryStore } from '@/stores/inventory'
import { useCultivationStore } from '@/stores/cultivation'
import { useLoadoutsStore } from '@/stores/loadouts'

describe('构筑快照(保存/一键切换)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function seed(): { weaponUid: string } {
    const inventory = useInventoryStore()
    const cultivation = useCultivationStore()
    const rng = new RandomService(mulberry32(7))
    const weapon = generateEquipment(3, rng, { slot: 'weapon' })
    inventory.addEquipment(weapon)
    inventory.equip(weapon.uid, 'weapon')
    cultivation.learn('m_taixuan')
    cultivation.equipMain('m_taixuan')
    cultivation.learn('s_tuna')
    cultivation.toggleSub('s_tuna', 2)
    inventory.addArtifact('af_lihuo')
    return { weaponUid: weapon.uid }
  }

  it('捕获→改动→一键还原', () => {
    const inventory = useInventoryStore()
    const cultivation = useCultivationStore()
    const { weaponUid } = seed()

    const loadout = captureLoadout('试剑')
    expect(loadout).not.toBeNull()
    expect(loadout!.equipment.weapon).toBe(weaponUid)

    // 打乱现状
    inventory.unequip('weapon')
    cultivation.subGongfa = []
    inventory.equippedArtifacts = []

    expect(applyLoadout(loadout!.id)).toBe(true)
    expect(inventory.equipped.weapon).toBe(weaponUid)
    expect(cultivation.subGongfa).toContain('s_tuna')
    expect(inventory.equippedArtifacts).toContain('af_lihuo')
  })

  it('部件缺失时跳过而不崩溃', () => {
    const inventory = useInventoryStore()
    const { weaponUid } = seed()
    const loadout = captureLoadout('残卷')!
    // 装备被分解
    inventory.removeEquipment(weaponUid)
    expect(applyLoadout(loadout.id)).toBe(true)
    expect(inventory.equipped.weapon).toBeUndefined()
  })

  it('槽位错配的装备不会被穿到错误位置', () => {
    const inventory = useInventoryStore()
    seed()
    const loadout = captureLoadout('验位')!
    // 伪造:把 weapon 槽指向一件衣袍
    const rng = new RandomService(mulberry32(9))
    const body = generateEquipment(3, rng, { slot: 'body' })
    inventory.addEquipment(body)
    loadout.equipment.weapon = body.uid
    applyLoadout(loadout.id)
    const equippedWeapon = inventory.equipped.weapon
    if (equippedWeapon) {
      expect(equipmentTemplate(inventory.findItem(equippedWeapon)!.templateId)!.slot).toBe('weapon')
    } else {
      expect(equippedWeapon).toBeUndefined()
    }
  })

  it('容量上限生效', () => {
    seed()
    const loadouts = useLoadoutsStore()
    for (let i = 0; i < 6; i += 1) {
      captureLoadout(`第${i}套`)
    }
    expect(loadouts.list.length).toBe(6)
    expect(captureLoadout('超载')).toBeNull()
  })
})
