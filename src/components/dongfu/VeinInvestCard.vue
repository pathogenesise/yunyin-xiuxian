<template>
  <div class="card-ink px-4 py-3">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="font-kai text-[14px] tracking-[0.25em] text-ink">灵脉投资</h3>
      <span class="text-[11px] text-ink-faint tabular">已投 {{ veinTotal }} 点</span>
    </div>
    <p class="mb-3 text-[11px] leading-relaxed text-ink-soft">
      炼化灵石永久强化洞府灵脉,获得全局属性加成。各脉平级,各自可投;
      某脉的投点上限由<strong class="font-normal text-ink">该效果本身的极限</strong>决定 —— 到了顶再投也不再多出分毫。
    </p>

    <div class="space-y-2.5">
      <div v-for="v in VEINS" :key="v.id" class="space-y-1">
        <button
          class="btn-ghost flex w-full items-center justify-between !py-1.5 !text-[12px]"
          :disabled="!canInvest(v.id)"
          @click="doInvest(v.id)"
        >
          <span class="min-w-0 truncate">{{ v.name }}</span>
          <span class="tabular text-[11px]">
            <span :class="isFull(v.id) ? 'text-jade' : 'text-ink-faint'">
              {{ currentLevel(v.id) }}<template v-if="cap(v.id) !== null">/{{ cap(v.id) }}</template>
            </span>
            <span class="ml-1.5 text-ink-ghost">{{ formatGN(investCost) }}</span>
          </span>
        </button>
        <!-- 每条脉都要自陈作用:此前只显示名字与价格,玩家无从判断该投哪条 -->
        <p class="px-0.5 text-[10px] leading-relaxed text-ink-faint">
          {{ v.desc }}
          <span class="text-azure">
            · {{ currentLevel(v.id) > 0 ? veinEffectText(v, currentLevel(v.id)) : `每点 ${veinEffectText(v, 1)}` }}
          </span>
        </p>
        <!-- 到了效果上限:明说再投无用,免得玩家把灵石扔进一条不再生效的脉 -->
        <p v-if="isFull(v.id)" class="px-0.5 text-[10px] text-jade">
          此效已至极限 {{ formatPercent(cap(v.id)!) }}
        </p>
      </div>
    </div>

    <p class="mt-3 text-[10px] text-azure">
      当前加成:
      <span v-if="!bonusLine" class="ml-1 text-ink-faint">尚无</span>
      <span v-else class="ml-1">{{ bonusLine }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useDongfuStore } from '@/stores/dongfu'
  import { usePlayerStore } from '@/stores/player'
  import { VEINS, INSIGHT_EFFECT_NAME, type VeinId } from '@/data/veins'
  import { veinEffectText } from '@/ui/veinText'
  import { investVein, veinPointCost, veinCap } from '@/core/veinService'
  import { VEIN_UNLOCK_MAJOR } from '@/data/constants'
  import { modsText } from '@/ui/statNames'
  import { formatGN, formatPercent } from '@/utils/format'

  const dongfu = useDongfuStore()
  const player = usePlayerStore()

  const investCost = computed(() => veinPointCost())
  const veinsUnlocked = computed(() => player.major >= VEIN_UNLOCK_MAJOR)
  const veinTotal = computed(() => dongfu.veinTotal)
  /**
   * 当前加成 —— 必须把不走 StatMods 的那一条也算进来。
   *
   * 寒冥灵脉的 perPoint 是空对象:它的效果是「功法参悟省悟道点」,
   * 走 dongfu.insightDiscount,不进 veinMods。此前这里只读 veinMods,
   * 于是投了满脉也一个字都不显示 —— 玩家因此不知道它有没有用
   */
  const bonusLine = computed(() => {
    const parts: string[] = []
    const mods = modsText(dongfu.veinMods)
    if (mods) parts.push(mods)
    if (dongfu.insightDiscount > 0) {
      parts.push(`${INSIGHT_EFFECT_NAME} −${formatPercent(dongfu.insightDiscount)}`)
    }
    return parts.join(' · ')
  })

  /** 该脉可投上限点数(判据与 investVein 同一处);null = 无上限 */
  function cap(veinId: VeinId): number | null {
    return veinCap(veinId)
  }

  function currentLevel(veinId: VeinId): number {
    return dongfu.veinPoints[veinId] ?? 0
  }

  function isFull(veinId: VeinId): boolean {
    const limit = cap(veinId)
    return limit !== null && currentLevel(veinId) >= limit
  }

  function canInvest(veinId: VeinId): boolean {
    if (!veinsUnlocked.value) return false
    return !isFull(veinId)
  }

  function doInvest(veinId: VeinId): void {
    investVein(veinId)
  }
</script>
