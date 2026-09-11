<template>
  <div class="stagger-in space-y-4 px-4 pb-6 pt-4">
    <!-- 境界与突破(修为圆满时整卡蓄势充能) -->
    <div class="card-ink px-4 py-4" :class="player.expFull ? 'card-charged' : ''">
      <div class="text-center">
        <p class="font-kai text-[11px] tracking-[0.5em] text-ink-faint">{{ player.worldName }}</p>
        <p class="font-kai text-[30px] tracking-[0.3em] text-ink">{{ player.realm.name }}</p>
        <p class="mt-0.5 font-kai text-[14px] tracking-[0.4em] text-cinnabar">{{ player.subName }}</p>
        <p class="mt-1 text-[11px] text-ink-faint">{{ player.realm.desc }}</p>
        <!-- 可解释性:这一境取自何处、因何承接(典籍 / 网文常用 / 道家本源) -->
        <p class="mt-1 text-[10px] leading-relaxed text-ink-ghost">
          「{{ player.realm.basis }}」{{ player.realm.lore }}
        </p>
      </div>
      <div class="mt-4">
        <div class="mb-1 flex justify-between text-[11px] text-ink-faint tabular">
          <button class="text-left active:opacity-60" @click="showCultBreakdown = !showCultBreakdown">
            修为 +{{ formatRate(player.cultPerSec) }}
            <span class="ml-0.5 text-[9px] text-ink-ghost">{{ showCultBreakdown ? '▾' : '▸' }}来路</span>
          </button>
          <span>
            {{ formatGN(player.expFull ? player.expReq : player.exp) }} / {{ formatGN(player.expReq) }}
            <span v-if="player.expFull && player.expOverflow.m > 0" class="text-jade">
              · 积 +{{ formatGN(player.expOverflow) }}
            </span>
          </span>
        </div>
        <div :class="player.expFull ? 'bar-charged' : ''">
        <ProgressBar :value="player.expProgress" color="var(--color-cinnabar)" :height="8" />
      </div>
      <!-- 修行速度是玩家最常盯的数,故在它自己那一行就地摊开:基础 × (1 + 各来源) -->
      <div v-if="showCultBreakdown" class="mt-2 rounded-md bg-paper-deep/60 px-2.5 py-2 text-[10px]">
        <p class="text-ink-soft">
          基础 {{ formatRate(cultBase) }}({{ player.realm.name }}{{ player.subName }}{{ player.linggen ? `·${player.linggen.gradeName}` : '' }})
          × (1 + <span class="tabular text-azure">{{ formatPercent(cultMultiplier) }}</span>)
          = <span class="tabular text-cinnabar">{{ formatRate(player.cultPerSec) }}</span>
        </p>
        <p v-for="row in cultSources" :key="row.name" class="mt-0.5 flex justify-between">
          <span class="text-ink-faint">{{ row.name }}</span>
          <span class="tabular" :class="row.value > 0 ? 'text-azure' : 'text-cinnabar'">
            {{ row.value > 0 ? '+' : '' }}{{ formatPercent(row.value) }}
          </span>
        </p>
        <p class="mt-1 text-[9px] leading-relaxed text-ink-ghost">
          这些都是修行速度的百分比加成,相加后乘在基础上 —— 与人物页属性明细同源。
        </p>
      </div>
      </div>
      <div class="mt-3">
        <div class="mb-1 flex justify-between text-[11px] text-ink-faint tabular">
          <span>灵气 +{{ formatRate(player.qiRegenPerSec) }}</span>
          <span>
            {{ formatNum(Math.floor(Math.min(resources.qi, player.qiCapValue))) }} / {{ formatNum(player.qiCapValue) }}
            <span v-if="resources.qi > player.qiCapValue" class="text-azure">
              · 积余 {{ formatNum(Math.floor(resources.qi)) }} / {{ formatNum(player.qiBankCapValue) }}
            </span>
          </span>
        </div>
        <ProgressBar
          :value="Math.min(1, resources.qi / Math.max(1, player.qiCapValue))"
          color="var(--color-azure)"
          :height="8"
        />
        <!-- 以灵气疗伤(修复):灵气积余的用途,代价随境界指数增长 -->
        <button
          v-if="repair.injured"
          type="button"
          class="btn-seal mt-2 w-full !py-2 !text-[12px]"
          :disabled="!repair.affordable"
          @click="repairWithQi()"
        >
          {{ repair.affordable ? `引气疗伤 · 耗灵气 ${formatNum(repair.cost)}` : `灵气不足(需 ${formatNum(repair.cost)})` }}
        </button>
      </div>

      <div class="ink-divider my-4" />
      <div class="flex items-center justify-between text-[12px] text-ink-soft">
        <span>下一步:{{ btInfo.targetLabel }}</span>
      </div>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <div class="rounded-md bg-paper-deep/60 px-2.5 py-1.5">
          <p class="text-[10px] text-ink-faint">突破成功率(进阶)</p>
          <p class="tabular text-[16px] font-kai leading-tight" :class="btInfo.rate >= 0.7 ? 'text-jade' : 'text-cinnabar'">
            {{ btInfo.rateText }}
          </p>
        </div>
        <div class="rounded-md bg-paper-deep/60 px-2.5 py-1.5">
          <p class="text-[10px] text-ink-faint">{{ btInfo.needTribulation ? '此劫' : '渡劫' }}</p>
          <template v-if="tribPlan">
            <p class="tabular text-[16px] font-kai leading-tight" :class="PLAN_COLOR[tribPlan.verdict]">
              {{ tribPlan.title }}
            </p>
            <p class="text-[10px] text-ink-faint">
              劫势:{{ verdictLabel(tribPlan.verdict) }}
              <template v-if="tribPlan.risks.length"> · {{ tribPlan.risks[0] }}</template>
            </p>
          </template>
          <p v-else class="text-[16px] font-kai leading-tight text-ink-ghost">非大关</p>
        </div>
      </div>

      <!-- Phase 32.0 劫势详情(决意前评估:风险维度 + 建议,信息给足,决定留给玩家) -->
      <div v-if="tribPlan" class="mt-2 rounded-md border border-violet-ink/25 bg-violet-ink/5 px-3 py-2">
        <p class="text-[11px] text-violet-ink">{{ tribPlan.desc }}</p>
        <p class="mt-1.5 text-[10px] text-ink-faint tabular">
          准备:
          <span class="text-ink-soft">{{ PREP_NAMES.guard }} {{ PREP_STARS[tribPlan.prep.guard] }}</span>
          · {{ PREP_NAMES.sustain }} {{ PREP_STARS[tribPlan.prep.sustain] }}
          · {{ PREP_NAMES.resist }} {{ PREP_STARS[tribPlan.prep.resist] }}
          · {{ PREP_NAMES.burst }} {{ PREP_STARS[tribPlan.prep.burst] }}
        </p>
        <p class="mt-1 text-[10px] text-ink-soft">主要风险:<span class="text-cinnabar/80">{{ tribPlan.risks.join('; ') }}</span></p>
        <p class="mt-1 text-[10px] text-ink-faint">{{ tribPlan.advice }}</p>
        <!-- Phase 32.2:灵根解开的那条路——说明这道劫为何对你不太一样(留一线,不是免死) -->
        <p v-if="reliefRoots.length" class="mt-1 text-[10px] text-jade">
          灵根相应:{{ reliefRoots.map(e => ELEMENTS[e].name).join('、') }}——此劫为你留了一线,能走到哪一步仍看自身准备
        </p>
      </div>
      <p class="mt-1 text-[11px] text-ink-faint tabular">
        耗灵气 {{ formatNum(btInfo.qiCost) }}
        <template v-if="btInfo.needTribulation">
          ·
          <span class="text-violet-ink">此乃大关,需渡天劫</span>
        </template>
        <template v-else-if="btInfo.isMajor">· 大境界之槛</template>
      </p>

      <!-- Phase 28 突破准备:静坐调息 / 服聚气丹(无劫突破时,一次性加成) -->
      <div v-if="!btInfo.needTribulation" class="mt-2 rounded-md border border-ink/10 bg-paper-deep/50 px-2.5 py-2">
        <div class="flex items-center justify-between text-[10px] text-ink-faint">
          <span>突破准备(一次有效)</span>
          <span v-if="btInfo.prep.sitting" class="text-amber-ink">调息中 · {{ formatDuration(btInfo.prep.remainingSec) }}</span>
          <span v-else-if="btInfo.prep.ready" class="text-jade">加成 +{{ Math.round(btInfo.prep.bonus * 100) }}% 就绪</span>
        </div>
        <div v-if="!btInfo.prep.sitting && !btInfo.prep.ready" class="mt-1.5 flex gap-1.5">
          <button type="button" class="chip-ink text-[10px]" @click="startPrep('meditate')">
            {{ prepMeditate.label }} · {{ Math.round(prepMeditate.duration / 60) }}分钟
            +{{ Math.round(prepMeditate.bonusRate * 100) }}%
          </button>
          <button type="button" class="chip-ink text-[10px]" :disabled="!prepCanPill" @click="startPrep('pill')">
            {{ prepPill.label }} · {{ prepPillCost }}灵石 +{{ Math.round(prepPill.bonusRate * 100) }}%
          </button>
        </div>
      </div>
      <button
        class="btn-seal mt-3 w-full !py-3"
        :class="{ 'animate-glow-pulse pulse-ready': btInfo.ready }"
        :disabled="!btInfo.ready"
        @click="attemptBreakthrough()"
      >
        {{ btInfo.ready ? (btInfo.needTribulation ? '引 劫 突 破' : '尝 试 突 破') : btInfo.reason }}
      </button>
    </div>

    <!-- Phase 28 闭关:5 分钟 +150% 修炼,期间禁止历练(数值唯一来源 = buffs.ts retreat + earlyGameService) -->
    <div class="card-ink px-4 py-3">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-ink-soft">闭关参悟</span>
        <span v-if="retreating" class="text-[10px] text-amber-ink tabular">闭关中 · {{ formatDuration(retreatRemaining) }}</span>
      </div>
      <p class="mt-0.5 text-[10px] text-ink-faint">
        静坐一炷香({{ retreatMinutes }} 分钟),修炼速度 +{{ retreatPct }}%;闭关期间无法外出历练。
      </p>
      <button v-if="!retreating" type="button" class="chip-ink mt-2 w-full text-[11px]" @click="beginRetreat">
        闭关 · {{ retreatMinutes }}分钟 修炼 +{{ retreatPct }}%(期间无法历练)
      </button>
    </div>

    <!-- 状态 -->
    <section v-if="activeBuffs.length">
      <SectionTitle title="状态" />
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="b in activeBuffs"
          :key="b.def!.id"
          type="button"
          class="chip-ink transition-transform active:scale-95"
          :class="b.def!.kind === 'injury' ? 'border-cinnabar/60 text-cinnabar' : 'border-jade/60 text-jade'"
          @click="ui.buffDetailId = b.def!.id"
        >
          <GameIcon :name="b.def!.icon" :size="11" />
          {{ b.def!.name }} {{ formatDuration(b.remain) }}
        </button>
      </div>
    </section>

    <!-- 丹药速服 -->
    <section v-if="quickPills.length">
      <SectionTitle title="以药辅道" />
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          v-for="p in quickPills"
          :key="p.def!.id"
          class="card-ink flex items-center gap-2 px-3 py-2 text-left active:scale-98"
          @click="usePill(p.def!.id)"
        >
          <GameIcon :name="p.def!.icon" :size="16" :style="{ color: qualityDef(p.def!.quality).color }" />
          <span class="min-w-0 grow">
            <span class="block truncate font-kai text-[12px] text-ink">{{ p.def!.name }}</span>
            <span class="block text-[10px] text-ink-faint">存 {{ p.count }}</span>
          </span>
          <span class="text-[11px] text-jade">服用</span>
        </button>
      </div>
    </section>

    <!-- 功法 -->
    <section>
      <SectionTitle title="功法" :hint="`残页 ${resources.page}`" />
      <div class="mt-2 space-y-2">
        <!-- 主修 -->
        <button
          v-if="mainDef"
          class="card-ink flex w-full items-center gap-3 px-3.5 py-3 text-left active:scale-99"
          @click="ui.gongfaDetailId = mainDef.id"
        >
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cinnabar/10 font-kai text-cinnabar">主</span>
          <span class="min-w-0 grow">
            <span class="block truncate font-kai text-[14px] text-ink">{{ mainDef.name }}</span>
            <span class="block text-[11px] text-ink-faint">
              第 {{ cultivation.learned[mainDef.id] }} 层 · {{ qualityDef(mainDef.quality).name }}
            </span>
          </span>
          <GameIcon name="flame" :size="15" class="text-cinnabar/70" />
        </button>

        <!-- 已习得列表(限高滚动,功法过多不撑爆页面) -->
        <div class="card-ink max-h-64 divide-y divide-ink/7 overflow-y-auto px-1">
          <button
            v-for="def in learnedList"
            :key="def!.id"
            class="flex w-full items-center gap-3 px-2.5 py-2.5 text-left active:bg-ink/4"
            @click="ui.gongfaDetailId = def!.id"
          >
            <span class="font-kai text-[13px]" :style="{ color: qualityDef(def!.quality).color }">{{ def!.name }}</span>
            <span class="text-[10px] text-ink-faint">{{ cultivation.learned[def!.id] }} 层</span>
            <!-- Phase 31 A3:已选分支显示道名;确有歧路可择时才招手,否则只报「圆满」 -->
            <span v-if="branchName(def!.id)" class="text-[10px] text-gold-ink">
              {{ branchName(def!.id) }}
            </span>
            <span v-else-if="canEnlighten(def!.id)" class="text-[10px] text-azure">待悟道 →</span>
            <span v-else-if="isFull(def!.id)" class="text-[10px] text-ink-ghost">圆满</span>
            <span class="ml-auto text-[10px]" :class="equipStateOf(def!.id) ? 'text-jade' : 'text-ink-ghost'">
              {{ equipStateOf(def!.id) || '未装配' }}
            </span>
          </button>
        </div>

        <button class="btn-ghost w-full" @click="comprehendGongfa()">于藏经阁参悟功法(残页×{{ COMPREHEND_PAGE_COST }})</button>
      </div>
    </section>

    <GongfaDialog />
    <BuffDialog />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import { useResourcesStore } from '@/stores/resources'
  import { useCultivationStore } from '@/stores/cultivation'
  import { useInventoryStore } from '@/stores/inventory'
  import { useUiStore } from '@/stores/ui'
  import { attemptBreakthrough, breakthroughInfo } from '@/core/breakthrough'
  import { prepareBreakthrough, startRetreat, isRetreating, getRetreatRemainingSec } from '@/core/earlyGameService'
  import { toNum } from '@/utils/gnum'
  import { baseCultPerSec } from '@/core/formulas'
  import { modOf } from '@/core/statsCalc'
  import { currentTribulationPlan, verdictLabel, type TribulationPlan } from '@/core/tribulationDecision'
  import { reliefElements, rootElements } from '@/core/linggenAffinity'
  import { comprehendGongfa } from '@/core/gongfaService'
  import { usePill } from '@/core/pillService'
  import { qiRepairView, repairWithQi } from '@/core/qiRepair'
  import { useNow } from '@/composables/useNow'
  import { BREAKTHROUGH_PREP_OPTIONS } from '@/data/earlyGame'
  import { gongfaDef } from '@/data/gongfa'
  import { ELEMENTS } from '@/data/linggen'
  import { canEnlighten as canEnlightenGongfa, gongfaBranchDef } from '@/data/gongfaBranches'
  import { buffDef } from '@/data/buffs'
  import { pillDef } from '@/data/pills'
  import { COMPREHEND_PAGE_COST } from '@/data/constants'
  import { formatDuration, formatGN, formatNum, formatPercent, formatRate } from '@/utils/format'
  import { qualityDef } from '@/data/qualities'
  import SectionTitle from '@/components/common/SectionTitle.vue'
  import ProgressBar from '@/components/common/ProgressBar.vue'
  import GameIcon from '@/components/common/GameIcon.vue'
  import GongfaDialog from '@/components/cultivation/GongfaDialog.vue'
  import BuffDialog from '@/components/cultivation/BuffDialog.vue'

  const player = usePlayerStore()
  const resources = useResourcesStore()

  /**
   * 修行速度的来路 —— 玩家最常盯的就是这一行,故就地摊开:
   *   基础(境界/层) × (1 + 各来源之和)
   * 来源取自 finalStats.breakdown,与人物页属性明细同源,不在界面里另算一遍。
   */
  const showCultBreakdown = ref(false)
  const cultBase = computed(() => baseCultPerSec(player.major, player.sub))
  const cultSources = computed(() =>
    player.finalStats.breakdown
      .map(r => ({ name: r.name, value: r.mods.cultivationSpeed ?? 0 }))
      .filter(r => r.value !== 0)
  )
  const cultMultiplier = computed(() => modOf(player.finalStats.mods, 'cultivationSpeed'))
  const cultivation = useCultivationStore()
  const inventory = useInventoryStore()
  const ui = useUiStore()
  const now = useNow()

  const btInfo = computed(() => breakthroughInfo())

  // Phase 28 突破准备:按钮文案/耗时/药价全部来自 BREAKTHROUGH_PREP_OPTIONS,不再在视图里写第二份
  const prepMeditate = BREAKTHROUGH_PREP_OPTIONS.find(o => o.id === 'meditate')!
  const prepPill = BREAKTHROUGH_PREP_OPTIONS.find(o => o.id === 'pill')!
  const prepPillCost = prepPill.cost?.stone ?? 0
  const prepCanPill = computed(() => toNum(resources.spiritStone) >= prepPillCost)

  function startPrep(option: 'meditate' | 'pill'): void {
    if (prepareBreakthrough(option)) {
      ui.toast(option === 'meditate' ? '你盘膝入定,静待调息完成' : '丹药入腹,气机已然蓄足', 'info')
    } else {
      ui.toast('灵石不足,无以备药', 'warn')
    }
  }

  // Phase 28 闭关:状态与倒计时接 earlyGameService(buff 为真相源,重载后依旧可信)
  const retreating = computed(() => isRetreating())
  const retreatRemaining = computed(() => getRetreatRemainingSec(now.value)) // now 每秒刷新,倒计时走动
  /**
   * 闭关的时长与加成取自 buffs.ts 的 retreat 本体(不在这里手抄 5 分钟 / +150%)。
   * 之前注释写着"数值唯一来源 = buffs.ts",但文案里的数字是手打的 —— 改常数就会撒谎。
   */
  const retreatDef = buffDef('retreat')
  const retreatMinutes = Math.round((retreatDef?.durationSec ?? 0) / 60)
  const retreatPct = Math.round((retreatDef?.mods.cultivationSpeed ?? 0) * 100)
  function beginRetreat(): void {
    if (startRetreat()) {
      ui.toast('你封洞闭关,心不外骛', 'info')
    }
  }

  // Phase 32.0 天劫决策:劫型 + 准备度(仅大关天劫时)
  const PLAN_COLOR: Record<TribulationPlan['verdict'], string> = {
    danger: 'text-cinnabar',
    hard: 'text-amber-ink',
    ok: 'text-azure',
    easy: 'text-jade'
  }
  const PREP_NAMES = { guard: '护持', sustain: '恢复', resist: '抗性', burst: '爆发' } as const
  const PREP_STARS = ['·', '✧', '✧✧', '✧✧✧'] as const
  const tribPlan = computed(() => (btInfo.value.needTribulation ? currentTribulationPlan() : null))

  /** 灵气疗伤(修复)状态:负伤时才出现入口,代价随灵气容量指数增长 */
  const repair = computed(() => qiRepairView())

  /** Phase 32.2 与此劫气机相应的灵根:判据取自 tribulationRelief,界面说的与结算做的同源 */
  const reliefRoots = computed(() =>
    tribPlan.value ? reliefElements(rootElements(player.linggen?.roots), tribPlan.value.kind) : []
  )

  const activeBuffs = computed(() =>
    cultivation.buffs
      .map(b => ({ def: buffDef(b.defId), remain: Math.max(0, (b.endsAt - now.value) / 1000) }))
      .filter(x => x.def !== undefined)
  )

  const learnedList = computed(() =>
    Object.keys(cultivation.learned)
      .map(id => gongfaDef(id))
      .filter(d => d !== undefined)
      .sort((a, b) => qualityDef(b!.quality).rank - qualityDef(a!.quality).rank)
  )

  const mainDef = computed(() => (cultivation.mainGongfa ? gongfaDef(cultivation.mainGongfa) : undefined))

  /** 修行相关丹药快捷栏:按品质降序,越珍稀的越靠前(原为插入序,先拿到什么显什么) */
  const quickPills = computed(() =>
    Object.entries(inventory.pills)
      .map(([id, count]) => ({ def: pillDef(id), count }))
      .filter(x => x.def !== undefined && x.count > 0)
      .filter(x => x.def!.kind === 'buff' || x.def!.instant?.expReqPct || x.def!.instant?.qiPct)
      .sort((a, b) => qualityDef(b.def!.quality).rank - qualityDef(a.def!.quality).rank)
      .slice(0, 4)
  )

  function equipStateOf(id: string): string {
    if (cultivation.mainGongfa === id) return '主修'
    if (cultivation.subGongfa.includes(id)) return '辅修'
    return ''
  }

  /** 功行是否已至顶层 */
  function isFull(id: string): boolean {
    return (cultivation.learned[id] ?? 0) >= (gongfaDef(id)?.maxLevel ?? 9)
  }

  /** 是否真能悟道(判据取自 gongfaBranches,界面提示与实际可选项同源) */
  function canEnlighten(id: string): boolean {
    return canEnlightenGongfa(id, cultivation.learned[id] ?? 0)
  }

  /** 已择分支的道名;未择、或旧存档留着一个已下线的分支 id,都算没有 */
  function branchName(id: string): string | undefined {
    const branchId = cultivation.gongfaBranch[id]
    return branchId ? gongfaBranchDef(branchId)?.name : undefined
  }
</script>
