<template>
  <div class="card-ink flex flex-col px-3 py-3" :class="flashing ? 'card-flash' : ''" @animationend.self="flashing = false">
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 truncate font-kai text-[14px] tracking-wider text-ink">{{ props.def.name }}</p>
      <p :key="level" class="shrink-0 text-[10px] text-ink-faint animate-ink-pop">
        {{ level > 0 ? `${level}/${cap} 级` : '未启用' }}
      </p>
    </div>
    <p class="mt-2 grow text-[11px] leading-relaxed text-ink-faint">
      {{ level > 0 ? props.def.effectText(level) : props.def.desc }}
    </p>
    <button class="btn-ghost mt-2 w-full !py-1.5 !text-[12px]" :disabled="!info.canUpgrade" @click="upgradeBuilding(props.def.id)">
      <!--
        数与量词必须黏在一起:窄屏(320)上卡片只有 ~140px,浏览器会在数字与「石」之间断行,
        于是按钮读成「升级 · 2,798 / 石 50铁」—— 单价被拆成两半。
        每个「数 + 量词」各自 nowrap,换行只发生在分隔符处。

        外面这层 span 也是必须的:btn-ghost 是 flex 容器,散落的文本节点会各自成为
        flex item 并**竖着堆**(实测直接把「升 / 级 / · / 317 石」排成一列)。
        收进一个 inline 文本块里,它们才按普通行内规则折行。
      -->
      <template v-if="info.canUpgrade">
        <span class="leading-tight">
          <span class="whitespace-nowrap">{{ level > 0 ? '升级' : '建造' }} ·</span>
          <span class="whitespace-nowrap">{{ formatGN(info.stone) }} 石</span>
          <span v-if="info.ore > 0" class="whitespace-nowrap">· {{ info.ore }} 铁</span>
        </span>
      </template>
      <template v-else>{{ info.reason }}</template>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { BuildingDef } from '@/types'
  import { useDongfuStore } from '@/stores/dongfu'
  import { buildingUpgradeInfo, upgradeBuilding } from '@/core/buildingService'
  import { formatGN } from '@/utils/format'

  const props = defineProps<{ def: BuildingDef }>()

  const dongfu = useDongfuStore()

  const level = computed(() => dongfu.levels[props.def.id] ?? 0)
  /** 实际可达上限:洞府全局闸门与自身品类上限取小,洞府卡展现的是"提升到什么档"的依据 */
  const cap = computed(() => dongfu.buildingCap(props.def.id))
  const info = computed(() => buildingUpgradeInfo(props.def.id))

  // 升级落成:整卡金光一闪(动画播完自清)
  const flashing = ref(false)
  watch(level, (nv, ov) => {
    if (nv > ov) flashing.value = true
  })
</script>
