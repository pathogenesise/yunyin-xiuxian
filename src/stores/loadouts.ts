/** 构筑快照 —— 保存/切换整套 Build(功法+法宝+装备) */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EquipSlot } from '@/types'
import { persistConfig } from '@/utils/storage'

export interface Loadout {
  id: string
  name: string
  /** 流派印章单字(保存时的识别结果) */
  seal: string
  mainGongfa: string | null
  subGongfa: string[]
  artifactIds: string[]
  /** 槽位 → 装备 uid */
  equipment: Partial<Record<EquipSlot, string>>
  savedAt: number
}

export const MAX_LOADOUTS = 6

export const useLoadoutsStore = defineStore(
  'loadouts',
  () => {
    const list = ref<Loadout[]>([])

    function add(loadout: Loadout): boolean {
      if (list.value.length >= MAX_LOADOUTS) return false
      list.value = [...list.value, loadout]
      return true
    }

    function remove(id: string): void {
      list.value = list.value.filter(l => l.id !== id)
    }

    return { list, add, remove }
  },
  { persist: persistConfig('loadouts') }
)
