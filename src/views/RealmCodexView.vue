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

    <!-- 周易:读过之后可以真的问一卦 -->
    <SectionTitle title="周易" hint="八卦为体,六十四卦为用" />
    <section class="card-ink px-4 py-3">
      <p class="text-[11px] leading-relaxed text-ink-faint">
        「易」不是书斋里的摆设:八卦各主一事之势,重卦由上下相叠 ——
        下卦为身,上卦为境,故一卦之力是内外相济的两股。摇得之卦在身,过时自散。
      </p>

      <!-- 在身之卦 -->
      <div v-if="currentReading" class="mt-3 rounded-md bg-paper-deep/50 px-3 py-2.5">
        <p class="flex flex-wrap items-center gap-2">
          <span class="font-kai text-[16px] tracking-widest text-cinnabar">{{ currentReading.hexagram.name }}卦</span>
          <span class="text-[10px] text-ink-faint tabular">
            上{{ currentReading.upper.name }}{{ currentReading.upper.symbol }} · 下{{ currentReading.lower.name
            }}{{ currentReading.lower.symbol }}
          </span>
          <span v-if="currentReading.changed" class="chip-ink !text-[9px]">之{{ currentReading.changed.name }}</span>
          <span class="ml-auto text-[10px] tabular text-ink-ghost">{{ remainText }}</span>
        </p>
        <div class="mt-1.5 space-y-0.5 font-kai text-[12px] tracking-[0.2em] text-ink-soft">
          <p v-for="(bar, i) in drawnLines" :key="i">{{ bar }}</p>
        </div>
        <p class="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{{ currentReading.hexagram.gist }}</p>
        <p v-for="(line, i) in counsel" :key="`c${i}`" class="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{{ line }}</p>
        <p class="mt-1.5 text-[11px] text-azure">在身之力:{{ powerText }}</p>
      </div>

      <div class="mt-2.5 flex items-center gap-2">
        <button
          class="btn-ghost !py-1.5 !text-[12px]"
          :disabled="!!player.activeDivination"
          @click="ask"
        >
          {{ player.activeDivination ? '卦在身,待其自过' : `问 卦(悟道点 ${DIVINATION_COST})` }}
        </button>
        <span class="text-[10px] leading-relaxed text-ink-ghost">
          卜以决疑,不疑何卜 —— 一事不二卜,卦力随动爻而盛,亦随时而尽。
        </span>
      </div>
    </section>

    <!-- 八卦 -->
    <section class="card-ink divide-y divide-ink/7 px-4">
      <div v-for="t in TRIGRAMS" :key="t.id" class="flex items-start gap-2 py-2.5">
        <span class="w-[52px] shrink-0 font-kai text-[15px] text-ink">{{ t.symbol }} {{ t.name }}</span>
        <span class="w-[56px] shrink-0 text-[10px] text-ink-faint">象{{ t.image }} · {{ t.nature }}</span>
        <span class="min-w-0 grow text-[11px] leading-relaxed text-ink-soft">{{ t.gist }}</span>
        <span class="shrink-0 text-[10px] text-jade">宜{{ t.good }}</span>
        <span class="shrink-0 text-[10px] text-cinnabar/80">忌{{ t.bad }}</span>
      </div>
    </section>

    <!-- 六十四卦:全表可查,但不必时时铺开 -->
    <section class="card-ink px-4 py-3">
      <button class="flex w-full items-center justify-between text-left" @click="showAllHex = !showAllHex">
        <span class="font-kai text-[13px] tracking-wider text-ink">六十四卦</span>
        <span class="text-[10px] text-azure">{{ showAllHex ? '收起' : `展开查看 ${HEXAGRAMS.length} 卦 →` }}</span>
      </button>
      <div v-if="showAllHex" class="mt-2 max-h-72 divide-y divide-ink/6 overflow-y-auto">
        <div v-for="x in HEXAGRAMS" :key="x.order" class="flex items-baseline gap-2 py-2">
          <span class="w-6 shrink-0 tabular text-[10px] text-ink-ghost">{{ x.order }}</span>
          <span class="w-14 shrink-0 font-kai text-[13px] text-ink">{{ x.name }}</span>
          <span class="w-16 shrink-0 text-[10px] text-ink-faint tabular">
            {{ trigramDef(x.upper)?.symbol }}{{ trigramDef(x.lower)?.symbol }}
          </span>
          <span class="min-w-0 text-[11px] leading-relaxed text-ink-soft">{{ x.gist }}</span>
        </div>
      </div>
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
  import { computed, ref } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import { useGameStore } from '@/stores/game'
  import { useUiStore } from '@/stores/ui'
  import { REALMS, WORLDS, realmDef } from '@/data/realms'
  import { CLASSICS, PLANNED_SCHOOLS } from '@/data/classics'
  import { HEXAGRAMS, TRIGRAMS, trigramDef } from '@/data/yijing'
  import { DIVINATION_COST, drawLines, readingCounsel, readingFromState } from '@/core/divination'
  import { askDivination } from '@/core/divinationService'
  import { modsText } from '@/ui/statNames'
  import SectionTitle from '@/components/common/SectionTitle.vue'

  const player = usePlayerStore()
  const game = useGameStore()
  const ui = useUiStore()

  const showAllHex = ref(false)

  /** 在身之卦:读一次心跳,过期的卦才会自己消失(与 player 的判定同一个办法) */
  const currentReading = computed(() => {
    void game.totalPlaySec
    const state = player.activeDivination
    return state ? readingFromState(state) : null
  })
  const drawnLines = computed(() => (currentReading.value ? drawLines(currentReading.value) : []))
  const counsel = computed(() => (currentReading.value ? readingCounsel(currentReading.value) : []))
  const powerText = computed(() => (currentReading.value ? modsText(player.divinationMods) : ''))
  const remainText = computed(() => {
    void game.totalPlaySec
    const state = player.activeDivination
    if (!state) return ''
    const ms = Math.max(0, state.expiresAt - Date.now())
    const m = Math.floor(ms / 60_000)
    const sec = Math.floor((ms % 60_000) / 1000)
    return m > 0 ? `尚余 ${m} 分 ${sec} 秒` : `尚余 ${sec} 秒`
  })

  function ask(): void {
    const out = askDivination()
    if (!out.ok) {
      ui.toast(out.reason ?? '未成卦', 'warn')
      return
    }
    const r = out.reading!
    ui.toast(`得「${r.hexagram.name}」卦${r.changed ? `,之${r.changed.name}` : ''}`, 'info')
  }

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
