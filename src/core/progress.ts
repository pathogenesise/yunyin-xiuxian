/**
 * 进度服务 —— 计数器 / 成就 / 主线任务 / 每日任务 / 奖励发放
 * 所有系统通过 track() 汇报行为,由此统一驱动成就与任务
 */
import type { AchvCond, CounterKey, RewardBundle } from '@/types'
import { gte } from '@/utils/gnum'
import { todayStr } from '@/utils/time'
import { ACHIEVEMENTS } from '@/data/achievements'
import { DAILY_TASKS, MAIN_QUESTS } from '@/data/quests'
import { titleDef } from '@/data/titles'
import { pillDef } from '@/data/pills'
import { stoneByTier } from './formulas'
import { usePlayerStore } from '@/stores/player'
import { useQuestsStore } from '@/stores/quests'
import { useResourcesStore } from '@/stores/resources'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import type { CollectionCategory } from '@/stores/quests'

/** 玩家当前所处的等效掉落层级 */
export function playerTier(): number {
  const player = usePlayerStore()
  return Math.min(20, player.major * 2 + 1 + (player.sub >= 5 ? 1 : 0))
}

export function grantReward(bundle: RewardBundle, quiet = false): string[] {
  const resources = useResourcesStore()
  const quests = useQuestsStore()
  const inventory = useInventoryStore()
  const ui = useUiStore()
  const lines: string[] = []
  if (bundle.stoneTier) {
    const v = stoneByTier(playerTier(), bundle.stoneTier)
    resources.addStone(v)
    lines.push('灵石')
  }
  if (bundle.wudao) {
    resources.addSmall('wudao', bundle.wudao)
    lines.push(`悟道点×${bundle.wudao}`)
  }
  if (bundle.herb) {
    resources.addSmall('herb', bundle.herb)
    lines.push(`灵草×${bundle.herb}`)
  }
  if (bundle.ore) {
    resources.addSmall('ore', bundle.ore)
    lines.push(`玄铁×${bundle.ore}`)
  }
  if (bundle.page) {
    resources.addSmall('page', bundle.page)
    lines.push(`残页×${bundle.page}`)
  }
  if (bundle.dust) {
    resources.addSmall('dust', bundle.dust)
    lines.push(`器灵尘×${bundle.dust}`)
  }
  if (bundle.pillId && pillDef(bundle.pillId)) {
    inventory.addPill(bundle.pillId, 1)
    lines.push(`丹药「${pillDef(bundle.pillId)!.name}」`)
  }
  if (bundle.titleId && titleDef(bundle.titleId)) {
    if (quests.ownTitle(bundle.titleId)) {
      lines.push(`称号「${titleDef(bundle.titleId)!.name}」`)
      if (!quiet) ui.toast(`获得称号「${titleDef(bundle.titleId)!.name}」`, 'rare')
    }
  }
  return lines
}

function evalCond(cond: AchvCond): boolean {
  const quests = useQuestsStore()
  const player = usePlayerStore()
  switch (cond.type) {
    case 'counter':
      return quests.counter(cond.key) >= cond.value
    case 'realm':
      return player.major >= cond.major
    case 'quality':
      return false // 品质成就由 checkQuality 显式触发
    case 'custom': {
      const m = /^realm_(\d+)_(\d+)$/.exec(cond.key)
      if (m) {
        const major = Number(m[1])
        const sub = Number(m[2])
        return player.major > major || (player.major === major && player.sub >= sub)
      }
      return false
    }
  }
}

function unlockAchievement(id: string): void {
  const quests = useQuestsStore()
  const ui = useUiStore()
  const def = ACHIEVEMENTS.find(a => a.id === id)
  if (!def || !quests.unlockAchievement(id)) return
  if (def.reward) grantReward(def.reward, true)
  ui.toast(`成就达成「${def.name}」`, 'rare')
}

/** 检查所有可自动判定的成就 */
export function checkAchievements(): void {
  const quests = useQuestsStore()
  for (const def of ACHIEVEMENTS) {
    if (quests.hasAchieved(def.id)) continue
    if (def.cond.type === 'quality' || def.cond.type === 'custom') continue
    if (evalCond(def.cond)) unlockAchievement(def.id)
  }
}

/** 品质成就(获得装备时显式调用) */
export function checkQualityAchievement(rank: number): void {
  const quests = useQuestsStore()
  for (const def of ACHIEVEMENTS) {
    if (def.cond.type === 'quality' && !quests.hasAchieved(def.id) && rank >= def.cond.rank) {
      unlockAchievement(def.id)
    }
  }
}

/** 特判成就 */
export function checkCustomAchievement(key: string): void {
  const quests = useQuestsStore()
  for (const def of ACHIEVEMENTS) {
    if (def.cond.type === 'custom' && def.cond.key === key && !quests.hasAchieved(def.id)) {
      unlockAchievement(def.id)
    }
  }
}

/** 周期检查(寿元/灵石等状态型成就) */
export function checkStateAchievements(): void {
  const player = usePlayerStore()
  const resources = useResourcesStore()
  if (player.lifespanRatio <= 0.1 && player.lifespanRatio > 0) checkCustomAchievement('lifespanLow')
  if (player.lifespanMax >= 10000) checkCustomAchievement('lifespan10k')
  if (gte(resources.spiritStone, { m: 1, e: 6 })) checkCustomAchievement('stone1m')
}

function checkMainQuest(): void {
  const quests = useQuestsStore()
  const ui = useUiStore()
  let guard = 0
  while (guard < 5) {
    guard += 1
    const current = MAIN_QUESTS[quests.mainIdx]
    if (!current || !evalCond(current.cond)) break
    grantReward(current.reward, true)
    ui.toast(`任务完成「${current.name}」`, 'success')
    quests.advanceMain()
  }
}

function checkDaily(): void {
  const quests = useQuestsStore()
  const ui = useUiStore()
  for (const task of DAILY_TASKS) {
    if (quests.daily.done.includes(task.id)) continue
    if (quests.dailyDelta(task.counterKey) >= task.target) {
      quests.markDailyDone(task.id)
      grantReward(task.reward, true)
      ui.toast(`日课已成「${task.name}」`, 'success')
    }
  }
}

/** 每日重置(引擎在日期变化时调用) */
export function rolloverDailyIfNeeded(): void {
  const quests = useQuestsStore()
  const today = todayStr()
  if (quests.daily.date !== today) {
    quests.rolloverDaily(today)
  }
}

/** 统一行为汇报入口 */
export function track(key: CounterKey, n = 1): void {
  const quests = useQuestsStore()
  quests.inc(key, n)
  checkAchievements()
  checkMainQuest()
  checkDaily()
}

/** 境界成就(突破后调用) */
export function trackRealm(): void {
  const player = usePlayerStore()
  const quests = useQuestsStore()
  for (const def of ACHIEVEMENTS) {
    if (def.cond.type === 'realm' && !quests.hasAchieved(def.id) && player.major >= def.cond.major) {
      unlockAchievement(def.id)
    }
  }
  checkMainQuest()
}

export function collect(category: CollectionCategory, id: string): void {
  useQuestsStore().collect(category, id)
}
