/** 背包与装备状态 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ArtifactOwned, EquipmentInstance, EquipSlot, GNum, StatMods } from '@/types'
import { add, gnZero } from '@/utils/gnum'
import { persistConfig } from '@/utils/storage'
import { resolveEquipStats } from '@/core/equipGen'
import { mergeMods } from '@/core/statsCalc'
import { artifactDef, ARTIFACT_LEVEL_BONUS } from '@/data/artifacts'
import { BAG_CAPACITY } from '@/data/constants'

export const useInventoryStore = defineStore(
  'inventory',
  () => {
    const items = ref<EquipmentInstance[]>([])
    const equipped = ref<Partial<Record<EquipSlot, string>>>({})
    const pills = ref<Record<string, number>>({})
    const artifacts = ref<ArtifactOwned[]>([])
    /** 已祭炼的法宝(元婴起可佩两件) */
    const equippedArtifacts = ref<string[]>([])

    const equippedUids = computed(() => new Set(Object.values(equipped.value).filter(Boolean) as string[]))

    const equippedItems = computed(() => items.value.filter(it => equippedUids.value.has(it.uid)))

    const bagItems = computed(() => items.value.filter(it => !equippedUids.value.has(it.uid)))

    const bagFull = computed(() => bagItems.value.length >= BAG_CAPACITY)

    /** 已装备件的平铺数值合计 */
    const equipFlats = computed(() => {
      const out = { attack: gnZero() as GNum, defense: gnZero() as GNum, maxHp: gnZero() as GNum }
      for (const it of equippedItems.value) {
        const r = resolveEquipStats(it)
        out.attack = add(out.attack, r.flats.attack)
        out.defense = add(out.defense, r.flats.defense)
        out.maxHp = add(out.maxHp, r.flats.maxHp)
      }
      return out
    })

    /** 已装备件 + 法宝被动的百分比属性合计 */
    const equipMods = computed<StatMods>(() => {
      const sources: StatMods[] = equippedItems.value.map(it => resolveEquipStats(it).mods)
      for (const art of currentArtifacts.value) {
        const def = artifactDef(art.defId)
        if (!def) continue
        const scaled: StatMods = {}
        const mult = 1 + art.level * ARTIFACT_LEVEL_BONUS
        for (const k in def.passive) {
          const key = k as keyof StatMods
          scaled[key] = (def.passive[key] ?? 0) * mult
        }
        sources.push(scaled)
      }
      return mergeMods(sources)
    })

    const currentArtifacts = computed<ArtifactOwned[]>(() =>
      equippedArtifacts.value.map(id => artifacts.value.find(a => a.defId === id)).filter((a): a is ArtifactOwned => a !== undefined)
    )

    function findItem(uid: string): EquipmentInstance | undefined {
      return items.value.find(it => it.uid === uid)
    }

    /** 加入装备;背包满则返回 false(由调用方决定折算) */
    function addEquipment(inst: EquipmentInstance): boolean {
      if (bagFull.value) return false
      items.value = [...items.value, inst]
      return true
    }

    function removeEquipment(uid: string): void {
      items.value = items.value.filter(it => it.uid !== uid)
      for (const slot in equipped.value) {
        if (equipped.value[slot as EquipSlot] === uid) {
          const next = { ...equipped.value }
          delete next[slot as EquipSlot]
          equipped.value = next
        }
      }
    }

    function replaceItem(inst: EquipmentInstance): void {
      items.value = items.value.map(it => (it.uid === inst.uid ? inst : it))
    }

    function equip(uid: string, slot: EquipSlot): void {
      equipped.value = { ...equipped.value, [slot]: uid }
    }

    function unequip(slot: EquipSlot): void {
      const next = { ...equipped.value }
      delete next[slot]
      equipped.value = next
    }

    function addPill(id: string, n: number): void {
      pills.value = { ...pills.value, [id]: (pills.value[id] ?? 0) + n }
    }

    function spendPill(id: string, n = 1): boolean {
      const have = pills.value[id] ?? 0
      if (have < n) return false
      const next = { ...pills.value }
      if (have - n <= 0) delete next[id]
      else next[id] = have - n
      pills.value = next
      return true
    }

    /** 获得法宝;重复返回 false(由调用方折算) */
    function addArtifact(defId: string): boolean {
      if (artifacts.value.some(a => a.defId === defId)) return false
      artifacts.value = [...artifacts.value, { defId, level: 0 }]
      if (equippedArtifacts.value.length === 0) equippedArtifacts.value = [defId]
      return true
    }

    function levelUpArtifact(defId: string): void {
      artifacts.value = artifacts.value.map(a => (a.defId === defId ? { ...a, level: a.level + 1 } : a))
    }

    /** 祭炼/收回法宝;槽满时替换最早佩戴的一件 */
    function toggleArtifact(defId: string, maxSlots: number): 'equipped' | 'unequipped' | 'replaced' {
      if (equippedArtifacts.value.includes(defId)) {
        equippedArtifacts.value = equippedArtifacts.value.filter(id => id !== defId)
        return 'unequipped'
      }
      if (equippedArtifacts.value.length < maxSlots) {
        equippedArtifacts.value = [...equippedArtifacts.value, defId]
        return 'equipped'
      }
      equippedArtifacts.value = [...equippedArtifacts.value.slice(1), defId]
      return 'replaced'
    }

    return {
      items,
      equipped,
      pills,
      artifacts,
      equippedArtifacts,
      equippedItems,
      equippedUids,
      bagItems,
      bagFull,
      equipFlats,
      equipMods,
      currentArtifacts,
      findItem,
      addEquipment,
      removeEquipment,
      replaceItem,
      equip,
      unequip,
      addPill,
      spendPill,
      addArtifact,
      levelUpArtifact,
      toggleArtifact
    }
  },
  { persist: persistConfig('inventory') }
)
