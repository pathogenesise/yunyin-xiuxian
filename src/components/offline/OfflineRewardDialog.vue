<template>
  <BaseModal :open="summary !== null" :closable="false" aria-label="离线归来结算">
    <div v-if="summary" class="text-center">
      <p class="font-kai text-2xl tracking-[0.5em] text-ink mt-1 animate-ink-pop">归 来</p>
      <p class="mt-2 text-[12px] text-ink-faint">
        {{ awayLine }}
      </p>
      <div class="ink-divider my-3" />
      <ul class="stagger-in space-y-2 text-left">
        <li v-for="row in rows" :key="row.label" class="flex items-center justify-between rounded-md bg-paper-deep/70 px-3 py-2">
          <span class="flex items-center gap-2 text-[13px] text-ink-soft">
            <GameIcon :name="row.icon" :size="15" class="text-ink-faint" />
            {{ row.label }}
          </span>
          <span class="tabular text-[13px] text-ink">{{ row.value }}</span>
        </li>
        <!--
          离线装备:入包的报总数 + 按品质分档,不列逐件(12h 约 1500 件);明细去行囊页看。
          收纳化尘的不再混进总数,单独一行收敛 —— 否则「拾得 1200 件」但行囊就是多了
          1200 件,被化尘的不在里面,玩家以为漏了账。
        -->
        <li v-if="equipTotal > 0" class="rounded-md bg-paper-deep/70 px-3 py-2">
          <p class="mb-1 flex items-center gap-2 text-[13px] text-ink-soft">
            <GameIcon name="backpack" :size="15" class="text-ink-faint" />
            拾得装备 ×{{ equipTotal }}
            <span v-if="recycledCount > 0" class="text-[11px] text-ink-faint"> · 智能收纳化尘 ×{{ recycledCount }}</span>
          </p>
          <p class="flex flex-wrap gap-x-3 gap-y-1">
            <span
              v-for="row in equipRows"
              :key="row.quality"
              class="font-kai text-[12px]"
              :style="{ color: qualityDef(row.quality as never).color }"
            >
              {{ row.name }}×{{ row.count }}
            </span>
          </p>
          <p class="mt-1 text-[10px] text-ink-ghost">明细已入行囊,去「行囊」页翻看</p>
        </li>
        <!-- 入包为零但收纳确实化了尘:只报化尘那一行,免得整块消失、玩家以为离线没打装备 -->
        <li v-else-if="recycledCount > 0" class="rounded-md bg-paper-deep/70 px-3 py-2">
          <p class="mb-1 flex items-center gap-2 text-[13px] text-ink-soft">
            <GameIcon name="backpack" :size="15" class="text-ink-faint" />
            智能收纳化尘 ×{{ recycledCount }}
          </p>
          <p class="mt-1 text-[10px] text-ink-ghost">达保留线的件才会入包,其余已按你的收纳规则化作器灵尘</p>
        </li>
      </ul>
      <p v-for="(note, i) in summary.notes" :key="i" class="mt-2 text-[11px] text-ink-faint">{{ note }}</p>
    </div>
    <template #footer>
      <button class="btn-seal w-full" @click="close">收 下</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { useUiStore } from '@/stores/ui'
  import { formatDuration, formatGN } from '@/utils/format'
  import { offlineAwayPhrase } from '@/ui/offlineText'
  import { qualityDef } from '@/data/qualities'
  import { playSfx } from '@/core/audio'
  import BaseModal from '@/components/common/BaseModal.vue'
  import GameIcon from '@/components/common/GameIcon.vue'

  const ui = useUiStore()

  const summary = computed(() => ui.offlineSummary)
  const awayLine = computed(() => {
    const s = summary.value
    if (!s) return ''
    return offlineAwayPhrase(
      formatDuration(s.seconds),
      s.capped ? formatDuration(s.cappedSeconds) : undefined
    )
  })

  // 归来一声钟磬,与收益清点同起
  watch(summary, (nv, ov) => {
    if (nv && !ov) playSfx('success')
  })

  const rows = computed(() => {
    const s = summary.value
    if (!s) return []
    const list: { icon: string; label: string; value: string }[] = []
    if (s.exp.m > 0) list.push({ icon: 'flame', label: '修为', value: `+${formatGN(s.exp)}` })
    if (s.stone.m > 0) list.push({ icon: 'gem', label: '灵石', value: `+${formatGN(s.stone)}` })
    if (s.qi > 0) list.push({ icon: 'wind', label: '灵气', value: `+${s.qi}` })
    if (s.herb > 0) list.push({ icon: 'leaf', label: '灵草', value: `+${s.herb}` })
    if (s.ore > 0) list.push({ icon: 'mountain', label: '玄铁', value: `+${s.ore}` })
    if (s.wudao > 0) list.push({ icon: 'book', label: '悟道点', value: `+${s.wudao}` })
    if (s.battles > 0) list.push({ icon: 'swords', label: '历练战斗', value: `${s.wins} 胜 / ${s.battles} 战` })
    if (s.events > 0) list.push({ icon: 'star', label: '途中际遇', value: `${s.events} 次` })
    // 镇压区在线路径的化尘(历练批量入包不化尘):行囊没收下的那几件,尘数要交代
    if (s.recycledDust > 0) {
      list.push({ icon: 'sparkles', label: '回收化尘', value: `器灵尘+${s.recycledDust}` })
    }
    return list
  })

  /**
   * 离线装备汇总(新口径):总数 + 按品质分档。
   * 旧逐件清单(equipment)只剩镇压区在线路径的兼容项,不再作为展示源 ——
   * 历练批量件不进它,故此处只读 equipmentSummary。
   */
  const equipTotal = computed(() => summary.value?.equipmentSummary?.[0]?.total ?? 0)
  const equipRows = computed(() => summary.value?.equipmentSummary?.[0]?.byQuality ?? [])
  /** 智能收纳离线化尘的件数(不入包) */
  const recycledCount = computed(() => summary.value?.recycledEquips ?? 0)

  function close(): void {
    ui.offlineSummary = null
  }
</script>
