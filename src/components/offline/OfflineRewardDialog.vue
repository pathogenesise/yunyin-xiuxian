<template>
  <BaseModal :open="summary !== null" :closable="false">
    <div v-if="summary" class="text-center">
      <p class="font-kai text-2xl tracking-[0.5em] text-ink mt-1 animate-ink-pop">归 来</p>
      <p class="mt-2 text-[12px] text-ink-faint">
        闭关
        <span class="font-kai text-[13px] text-ink">{{ formatDuration(summary.seconds) }}</span>
        <template v-if="summary.capped">(收益按 {{ formatDuration(summary.cappedSeconds) }} 结算)</template>
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
        <li v-if="summary.equipment.length" class="rounded-md bg-paper-deep/70 px-3 py-2">
          <p class="mb-1 flex items-center gap-2 text-[13px] text-ink-soft">
            <GameIcon name="backpack" :size="15" class="text-ink-faint" />
            拾得装备 ×{{ summary.equipment.length }}
          </p>
          <p class="flex flex-wrap gap-x-3 gap-y-1">
            <span
              v-for="(eq, i) in summary.equipment"
              :key="i"
              class="font-kai text-[12px]"
              :style="{ color: qualityDef(eq.quality).color }"
            >
              {{ qualityDef(eq.quality).name }}·{{ eq.name }}
            </span>
          </p>
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
  import { qualityDef } from '@/data/qualities'
  import { playSfx } from '@/core/audio'
  import BaseModal from '@/components/common/BaseModal.vue'
  import GameIcon from '@/components/common/GameIcon.vue'

  const ui = useUiStore()

  const summary = computed(() => ui.offlineSummary)

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
    if (s.herb > 0) list.push({ icon: 'leaf', label: '灵草', value: `+${s.herb}` })
    if (s.ore > 0) list.push({ icon: 'mountain', label: '玄铁', value: `+${s.ore}` })
    if (s.wudao > 0) list.push({ icon: 'book', label: '悟道点', value: `+${s.wudao}` })
    if (s.battles > 0) list.push({ icon: 'swords', label: '历练战斗', value: `${s.wins} 胜 / ${s.battles} 战` })
    if (s.events > 0) list.push({ icon: 'star', label: '路遇际会', value: `${s.events} 次` })
    return list
  })

  function close(): void {
    ui.offlineSummary = null
  }
</script>
