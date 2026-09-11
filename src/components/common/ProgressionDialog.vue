<template>
  <BaseModal :open="open" title="数值体系" @close="$emit('close')">
    <div class="space-y-3 text-[12px] leading-relaxed">
      <p class="text-ink-faint">
        每个大境界,数值按复利增长;而"净耗时"增长得更慢 —— 字段里的倍率都取自代码常数,
        不是手写的漂亮话。
      </p>

      <!-- 各数值轴的复利倍率 -->
      <div class="card-ink px-3 py-2">
        <p class="text-[10px] text-ink-faint">每境复利(人间界 / 界外)</p>
        <div class="mt-1.5 space-y-1.5">
          <div v-for="a in PROGRESSION_AXES" :key="a.id" class="flex items-start gap-2">
            <span class="w-[104px] shrink-0 text-ink-soft">{{ a.name }}</span>
            <span class="w-[92px] shrink-0 tabular text-ink">
              ×{{ a.mortal.toFixed(1) }} / ×{{ a.outer.toFixed(1) }}
            </span>
            <span class="min-w-0 grow text-[10px] text-ink-faint">{{ a.note }}</span>
          </div>
        </div>
      </div>

      <!-- 净耗时:玩家真正感受到的难度 -->
      <div class="card-ink px-3 py-2">
        <p class="text-[10px] text-ink-faint">净耗时(难度感 = 修为需求 ÷ 修炼速度)</p>
        <p class="mt-1 text-ink-soft tabular">
          人间界 ×{{ MORTAL_TIME_PER_MAJOR.toFixed(2) }} / 境 · 界外 ×{{ OUTER_TIME_PER_MAJOR.toFixed(2) }} / 境
        </p>
        <p class="mt-1 text-[10px] text-ink-faint">
          数值按指数堆叠,耗时却压在 x{{ OUTER_TIME_PER_MAJOR.toFixed(2) }} —— 于是每一境都明显更"重",
          整条阶梯仍在可达范围。渡劫之上为界外(第 {{ PROGRESSION_NOTES.worldBreakMajor + 1 }} 境起)。
        </p>
      </div>

      <!-- 积余:卡境不浪费 -->
      <div class="card-ink px-3 py-2">
        <p class="text-[10px] text-ink-faint">积余(卡境也继续增长)</p>
        <ul class="mt-1 space-y-1">
          <li v-for="line in PROGRESSION_NOTES.banking" :key="line" class="text-ink-soft">· {{ line }}</li>
        </ul>
      </div>

      <!-- 命名出处 -->
      <div class="card-ink px-3 py-2">
        <p class="text-[10px] text-ink-faint">境界名的出处</p>
        <ul class="mt-1 space-y-1">
          <li v-for="line in PROGRESSION_NOTES.basis" :key="line" class="text-ink-soft">· {{ line }}</li>
        </ul>
        <p class="mt-1.5 text-[10px] text-ink-faint">
          每一境在修行页都写着它取自何处、因何承接。
        </p>
      </div>
    </div>
    <template #footer>
      <button class="btn-seal w-full" @click="$emit('close')">知道了</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
  import BaseModal from './BaseModal.vue'
  import {
    MORTAL_TIME_PER_MAJOR,
    OUTER_TIME_PER_MAJOR,
    PROGRESSION_AXES,
    PROGRESSION_NOTES
  } from '@/data/progressionDoc'

  defineProps<{ open: boolean }>()
  defineEmits<{ close: [] }>()
</script>
