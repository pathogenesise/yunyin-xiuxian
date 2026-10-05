<template>
  <div class="card-ink px-4 py-3.5">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="font-kai text-[14px] tracking-[0.25em] text-ink">灵脉投资</h3>
      <span class="text-[11px] text-ink-faint tabular">已投 {{ veinTotal }} 点</span>
    </div>
    <p class="mb-3 text-[11px] leading-relaxed text-ink-soft">
      炼化灵石永久强化洞府灵脉,获得全局属性加成。各脉平级,各自可投;
      某脉的投点上限由<strong class="font-normal text-ink">该效果本身的极限</strong>决定 —— 到了顶再投也不再多出分毫。
    </p>

    <div class="mt-3 space-y-2">
      <div
        v-for="v in VEINS"
        :key="v.id"
        class="rounded-lg border border-ink/8 bg-paper-deep/40 px-2.5 py-2.5"
      >
        <div class="flex items-start gap-2.5">
          <!-- 脉章:方印托一字,与建筑卡同一套印章语言;字色随脉系 -->
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md font-kai text-[15px] leading-none" :class="TONES[v.id].seal">
            <span class="translate-y-[1px]">{{ v.seal }}</span>
          </span>
          <div class="min-w-0 grow">
            <p class="flex flex-wrap items-center gap-1.5">
              <span class="truncate font-kai text-[13px] text-ink">{{ v.name }}</span>
            </p>
            <p class="mt-0.5 text-[10px] leading-relaxed text-ink-faint">{{ v.desc }}</p>
            <!-- 每条脉都要自陈作用:此前只显示名字与价格,玩家无从判断该投哪条 -->
            <p class="mt-0.5 text-[10px] leading-relaxed text-azure">
              {{ currentLevel(v.id) > 0 ? veinEffectText(v, currentLevel(v.id)) : `每点 ${veinEffectText(v, 1)}` }}
            </p>
            <!-- 单脉进度:已投/该脉效果上限,着脉色;无上限的脉只报已投数 -->
            <div v-if="cap(v.id) !== null" class="mt-1.5 flex items-center gap-2">
              <div class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/6">
                <div class="h-full rounded-full transition-all" :class="TONES[v.id].bar" :style="{ width: capPct(v.id) + '%' }"></div>
              </div>
              <span class="shrink-0 text-[10px] tabular text-ink-faint">
                {{ currentLevel(v.id) }}/{{ cap(v.id) }}
              </span>
            </div>
            <!-- 到了效果上限:明说再投无用,免得玩家把灵石扔进一条不再生效的脉 -->
            <p v-if="isFull(v.id)" class="mt-0.5 px-0.5 text-[10px] text-jade">
              此效已至极限 {{ formatPercent(cap(v.id)!) }}
            </p>
          </div>
          <!-- 投点单列:主动权放右边,说明体不再整行抢点击 -->
          <div class="flex shrink-0 flex-col items-end gap-1 self-start">
            <button class="btn-ghost whitespace-normal !px-2.5 !py-1.5 !text-[11px]" :disabled="!canInvest(v.id)" @click="doInvest(v.id)">
              <template v-if="canInvest(v.id)">
                <span class="hidden min-[400px]:inline">投一点 · </span>
                <span class="whitespace-nowrap">{{ formatGN(investCost) }} 石</span>
              </template>
              <template v-else>{{ investedStateLabel(v.id) }}</template>
            </button>
          </div>
        </div>

        <!-- 连投批量行:一口气能注 ≥2 点才出现,总账先报清(与群批同一条式子,所见即所得) -->
        <div v-if="plans[v.id].points >= 2" class="mt-2 flex items-center gap-2 rounded-md border border-ink/10 bg-paper-deep/50 px-2.5 py-2">
          <template v-if="batchArm !== v.id">
            <p class="min-w-0 flex-1 text-[10px] leading-snug text-ink-soft">
              连投至 <span class="font-kai text-[11px] text-cinnabar">第 {{ currentLevel(v.id) + plans[v.id].points }} 点</span>
              <span class="mt-0.5 block text-[9px] text-ink-faint tabular">共耗 灵石 {{ formatGN(plans[v.id].stone) }}</span>
            </p>
            <button class="btn-ghost shrink-0 !px-3 !py-2 !text-[11px]" @click="batchArm = v.id">连 投</button>
          </template>
          <template v-else>
            <p class="min-w-0 flex-1 text-[10px] leading-snug text-ink-soft">
              一步连投 {{ plans[v.id].points }} 点,花上面那笔总账 —— 仍要?
            </p>
            <button class="btn-ghost shrink-0 !px-2.5 !py-2 !text-[11px]" @click="batchArm = null">再想想</button>
            <button class="btn-seal shrink-0 !px-2.5 !py-2 !text-[11px]" @click="runBatch(v.id)">连 投</button>
          </template>
        </div>
      </div>
    </div>

    <!-- 加成列账:六条脉各归一行,投了的报当期效果、没投的一句见灰 —— 谁在出力,一眼可辨 -->
    <div class="mt-3 border-t border-ink/6 pt-2.5">
      <p class="text-[10px] text-ink-faint">当前加成 · 六脉各记一账</p>
      <div class="mt-1.5 space-y-1">
        <div v-for="v in VEINS" :key="v.id" class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="currentLevel(v.id) > 0 ? TONES[v.id].dot : 'bg-ink/15'"></span>
          <span class="w-14 shrink-0 text-[10px] text-ink-soft">{{ v.name }}</span>
          <span class="min-w-0 truncate text-[10px] tabular" :class="currentLevel(v.id) > 0 ? 'text-ink' : 'text-ink-faint'">
            {{ ledgerText(v.id) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useDongfuStore } from '@/stores/dongfu'
  import { usePlayerStore } from '@/stores/player'
  import { VEINS, veinDef, type VeinId } from '@/data/veins'
  import { veinEffectText } from '@/ui/veinText'
  import { investVein, investVeinBatch, veinInvestPlan, veinPointCost, veinCap, type VeinInvestPlan } from '@/core/veinService'
  import { VEIN_UNLOCK_MAJOR } from '@/data/constants'
  import { formatGN, formatPercent } from '@/utils/format'

  const dongfu = useDongfuStore()
  const player = usePlayerStore()

  /**
   * 六脉各配一色系。字面量类串,不许拼 —— Tailwind 的 JIT 只认源码里写全的类;
   * 章、进度条、列账圆点全部从这里取,同一脉只一个色相,全书不乱。
   * dot/bar 由进度条与列账用,seal 行内即刻生效。
   */
  const TONES: Record<VeinId, { seal: string; dot: string; bar: string }> = {
    gather: { seal: 'bg-jade/10 text-jade', dot: 'bg-jade', bar: 'bg-jade' },
    craft: { seal: 'bg-cinnabar/10 text-cinnabar', dot: 'bg-cinnabar', bar: 'bg-cinnabar' },
    alchemy: { seal: 'bg-gold-ink/10 text-gold-ink', dot: 'bg-gold-ink', bar: 'bg-gold-ink' },
    insight: { seal: 'bg-violet-ink/15 text-violet-ink', dot: 'bg-violet-ink', bar: 'bg-violet-ink' },
    fortune: { seal: 'bg-amber-400/10 text-amber-400', dot: 'bg-amber-400', bar: 'bg-amber-400' },
    swift: { seal: 'bg-sky-400/10 text-sky-400', dot: 'bg-sky-400', bar: 'bg-sky-400' }
  }

  const investCost = computed(() => veinPointCost())
  const veinsUnlocked = computed(() => player.major >= VEIN_UNLOCK_MAJOR)
  const veinTotal = computed(() => dongfu.veinTotal)

  /**
   * 列账文字 —— 必须把不走 StatMods 的那一条也算进来。
   *
   * 寒冥灵脉的 perPoint 是空对象:它的效果是「参悟省耗」,
   * 走 dongfu.insightDiscount,不进 veinMods。veinEffectText 内部已把参悟省耗并入,
   * 此处不必再单独凑。六条脉各占一行,谁在出力、出力几许,一眼可辨。
   */
  function ledgerText(veinId: VeinId): string {
    const lv = currentLevel(veinId)
    return lv > 0 ? `${lv} 点 · ${veinEffectText(veinDef(veinId), lv)}` : '未投'
  }

  /** 该脉可投上限点数(判据与 investVein 同一处);null = 无上限 */
  function cap(veinId: VeinId): number | null {
    return veinCap(veinId)
  }

  /** 单脉已投 / 该脉上限;无上限的脉不画分度(模板已隐藏,此处兜底) */
  function capPct(veinId: VeinId): number {
    const c = cap(veinId)
    if (c === null) return Math.min(100, currentLevel(veinId))
    return c <= 0 ? 0 : Math.min(100, Math.round((currentLevel(veinId) / c) * 100))
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

  /** 投点钮在不可投时的说辞:到效之极 / 未开,各说各的(无主脉/总容量之说) */
  function investedStateLabel(veinId: VeinId): string {
    if (isFull(veinId)) return '已至极限'
    if (!veinsUnlocked.value) return '未开'
    return '不可投'
  }

  /** 六条脉的连投计划:一口气能注几点、花多少,行只用量,不算价 */
  const plans = computed<Record<VeinId, VeinInvestPlan>>(() => ({
    gather: veinInvestPlan('gather'),
    craft: veinInvestPlan('craft'),
    alchemy: veinInvestPlan('alchemy'),
    insight: veinInvestPlan('insight'),
    fortune: veinInvestPlan('fortune'),
    swift: veinInvestPlan('swift')
  }))

  /** 连投的二步确认态:条脉一个坑位,行自随计划进退 */
  const batchArm = ref<VeinId | null>(null)
  function runBatch(veinId: VeinId): void {
    batchArm.value = null
    investVeinBatch(veinId) // 总账那一声与 toast 由服务自己报
  }

  function doInvest(veinId: VeinId): void {
    investVein(veinId)
  }
</script>
