/** 资源状态 —— 灵石(大数)与各类材料 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GNum, SmallResourceId } from '@/types'
import { add, gn, gnZero, gte, subClamp } from '@/utils/gnum'
import { persistConfig } from '@/utils/storage'

export const useResourcesStore = defineStore(
  'resources',
  () => {
    const spiritStone = ref<GNum>(gnZero())
    const qi = ref(0)
    const wudao = ref(0)
    const herb = ref(0)
    const ore = ref(0)
    const page = ref(0)
    const dust = ref(0)

    const smallRefs = { wudao, herb, ore, page, dust }

    function addStone(v: GNum): void {
      spiritStone.value = add(spiritStone.value, v)
    }

    function spendStone(v: GNum): boolean {
      if (!gte(spiritStone.value, v)) return false
      spiritStone.value = subClamp(spiritStone.value, v)
      return true
    }

    function hasStone(v: GNum): boolean {
      return gte(spiritStone.value, v)
    }

    function addSmall(id: SmallResourceId, n: number): void {
      const r = smallRefs[id]
      r.value = Math.max(0, Math.floor(r.value + n))
    }

    function spendSmall(id: SmallResourceId, n: number): boolean {
      const r = smallRefs[id]
      if (r.value < n) return false
      r.value -= n
      return true
    }

    function hasSmall(id: SmallResourceId, n: number): boolean {
      return smallRefs[id].value >= n
    }

    function setQi(v: number, cap: number): void {
      qi.value = Math.max(0, Math.min(cap, v))
    }

    /** 存档修复:重建大数字段 */
    function sanitize(): void {
      spiritStone.value = gn(spiritStone.value)
      for (const key of Object.keys(smallRefs) as SmallResourceId[]) {
        const r = smallRefs[key]
        if (!Number.isFinite(r.value)) r.value = 0
      }
      if (!Number.isFinite(qi.value)) qi.value = 0
    }

    return {
      spiritStone,
      qi,
      wudao,
      herb,
      ore,
      page,
      dust,
      addStone,
      spendStone,
      hasStone,
      addSmall,
      spendSmall,
      hasSmall,
      setQi,
      sanitize
    }
  },
  { persist: persistConfig('resources') }
)
