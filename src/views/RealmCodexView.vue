<template>
  <div class="stagger-in space-y-4 px-4 pb-6 pt-4">
    <div class="flex items-center gap-2">
      <RouterLink to="/character" class="text-[12px] text-ink-faint active:text-ink-soft">← 人物</RouterLink>
      <span class="text-[11px] text-ink-ghost">·</span>
      <span class="text-[12px] text-ink-soft">界域志</span>
    </div>

    <SectionTitle title="界域志" hint="境界名从哪来,一路读下去" />

    <!-- 界域与境界:逐境写明出处与承接 -->
    <section v-for="row in worldRows" :key="row.world.id" class="card-ink px-4 py-3">
      <div class="flex items-baseline gap-2">
        <span class="font-kai text-[15px] tracking-[0.25em] text-ink">{{ row.world.name }}</span>
        <span class="text-[10px] text-ink-ghost">第 {{ row.world.start + 1 }}–{{ row.world.end + 1 }} 境</span>
      </div>
      <p class="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{{ row.world.desc }}</p>
      <div class="mt-2 space-y-2">
        <div
          v-for="cell in row.realms"
          :key="cell.def.id"
          class="rounded-md px-2.5 py-2"
          :class="cell.index === player.major ? 'bg-cinnabar/8' : 'bg-paper-deep/50'"
        >
          <p class="flex items-center gap-2">
            <span
              class="font-kai text-[14px] tracking-wider"
              :class="cell.index === player.major ? 'text-cinnabar' : cell.index < player.major ? 'text-ink-soft' : 'text-ink-faint'"
            >
              {{ cell.def.name }}
            </span>
            <span class="chip-ink !text-[9px]">{{ cell.def.basis }}</span>
            <span v-if="cell.index === player.major" class="text-[9px] text-cinnabar">此刻在此</span>
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-ink-soft">{{ cell.def.desc }}</p>
          <p class="mt-1 text-[11px] leading-relaxed text-ink-faint">{{ cell.def.lore }}</p>
        </div>
      </div>
    </section>

    <!-- 典籍:境界名背后的原典 -->
    <SectionTitle title="典籍" hint="所述者传统道教、佛教、道家与丹道之书" />
    <section class="space-y-2">
      <article v-for="c in CLASSICS" :key="c.id" class="card-ink px-4 py-3">
        <p class="flex flex-wrap items-center gap-2">
          <span class="font-kai text-[14px] text-ink">《{{ c.title }}》</span>
          <span class="chip-ink !text-[9px]">{{ c.school }}</span>
          <span class="text-[10px] text-ink-faint">{{ c.source }}</span>
        </p>
        <p class="mt-1 text-[11px] leading-relaxed text-ink-soft">{{ c.gist }}</p>
        <p v-if="c.realms.length" class="mt-1 text-[10px] text-ink-faint">
          相涉:{{ c.realms.map(id => realmName(id)).join('、') }}
        </p>
      </article>
    </section>

    <!-- 待续:如实标注尚未实装的门类 -->
    <SectionTitle title="待续" hint="已列入路线、尚未实装的经典门类" />
    <section class="card-ink divide-y divide-ink/7 px-4">
      <div v-for="p in PLANNED_SCHOOLS" :key="p.name" class="flex items-start gap-2 py-2.5">
        <span class="w-[104px] shrink-0 font-kai text-[12px] text-ink-soft">{{ p.name }}</span>
        <span class="text-[11px] leading-relaxed text-ink-faint">{{ p.note }}</span>
      </div>
      <p class="py-2.5 text-[10px] leading-relaxed text-ink-ghost">
        这里只列尚未动的门类,不写空话 —— 真接上之后,它们会带着自己的典籍与玩法搬进来。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import { REALMS, WORLDS, realmDef } from '@/data/realms'
  import { CLASSICS, PLANNED_SCHOOLS } from '@/data/classics'
  import SectionTitle from '@/components/common/SectionTitle.vue'

  const player = usePlayerStore()

  const worldRows = computed(() =>
    WORLDS.map(w => ({
      world: w,
      realms: REALMS.map((def, index) => ({ def, index })).filter(c => c.index >= w.start && c.index <= w.end)
    }))
  )

  function realmName(id: string): string {
    const idx = REALMS.findIndex(r => r.id === id)
    return idx >= 0 ? realmDef(idx).name : id
  }
</script>
