/**
 * Phase 28 前期玩法服务 —— 悟道顿悟/突破准备/闭关/探索路线/连胜/洞府巡游/灵兽陪行
 */
import { usePlayerStore } from '@/stores/player'
import { useCultivationStore } from '@/stores/cultivation'
import { useResourcesStore } from '@/stores/resources'
import { usePacingTelemetry } from '@/stores/pacingTelemetry'
import type { EnlightenmentEvent, EnlightenmentOption, CaveEvent } from '@/types'
import {
  ENLIGHTENMENT_OPTIONS,
  ROUTE_CONFIGS,
  CAVE_EVENT_POOL,
  CHAIN_EVENT_IDS,
  WIN_STREAK_REWARDS
} from '@/data/earlyGame'
import { gn } from '@/utils/gnum'

function telemetry(): ReturnType<typeof usePacingTelemetry> {
  return usePacingTelemetry()
}

let enlightenmentEvent: EnlightenmentEvent | null = null
let caveEvent: CaveEvent | null = null
let retreatEndTime: number | null = null // 闭关结束时间戳
let breakthroughPrepEndTime: number | null = null // 突破准备结束时间戳
let breakthroughPrepBonus: number = 0 // 突破准备加成

/** 获取当前悟道顿悟事件(60秒窗口) */
export function getCurrentEnlightenment(): EnlightenmentEvent | null {
  if (!enlightenmentEvent) return null
  const now = Date.now()
  if (now > enlightenmentEvent.expiresAt) {
    enlightenmentEvent = null
    return null
  }
  return enlightenmentEvent
}

/** 触发悟道顿悟(修炼时低概率,每5分钟最多触发1次) */
let lastEnlightenmentTime = 0
export function mayTriggerEnlightenment(): void {
  const now = Date.now()
  if (now - lastEnlightenmentTime < 300000) return // 5分钟冷却
  if (Math.random() > 0.08) return // 8%概率

  // 随机选3个不同类型的选项
  const pool = [...ENLIGHTENMENT_OPTIONS]
  const options: EnlightenmentOption[] = []
  const usedTypes = new Set<string>()

  while (options.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    const opt = pool[idx]!
    if (!usedTypes.has(opt.type)) {
      options.push(opt)
      usedTypes.add(opt.type)
    }
    pool.splice(idx, 1)
  }

  enlightenmentEvent = {
    id: `enlighten_${now}`,
    options,
    triggeredAt: now,
    expiresAt: now + 60000 // 60秒窗口
  }
  lastEnlightenmentTime = now
  telemetry().record('enlightenment', 'modal', '悟道顿悟浮现')
}

/** 选择悟道顿悟选项 */
export function chooseEnlightenment(optionIndex: number): void {
  if (!enlightenmentEvent || optionIndex >= enlightenmentEvent.options.length) return
  const opt = enlightenmentEvent.options[optionIndex]!
  const cult = useCultivationStore()
  const now = Date.now()

  // 应用buff(addBuff签名: defId, now)
  cult.addBuff(opt.buffId, now)

  telemetry().record('enlightenment_choose', 'modal', `悟道:${opt.label}`)
  enlightenmentEvent = null
}

/** 开始闭关(5分钟,修炼+150%,禁止探索) */
export function startRetreat(): boolean {
  if (retreatEndTime && Date.now() < retreatEndTime) return false // 已在闭关

  const cult = useCultivationStore()
  const now = Date.now()
  cult.addBuff('retreat', now)

  retreatEndTime = Date.now() + 300000
  telemetry().record('retreat', 'modal', '开始闭关')
  return true
}

/** 获取当前闭关状态并遥测 */
export function isRetreating(): boolean {
  if (!retreatEndTime) return false
  const now = Date.now()
  if (now > retreatEndTime) {
    retreatEndTime = null
    return false
  }
  return true
}

/** 突破准备(静坐/服丹) */
export function prepareBreakthrough(optionId: string): boolean {
  const resources = useResourcesStore()

  if (optionId === 'meditate') {
    breakthroughPrepBonus = 0.08
    breakthroughPrepEndTime = Date.now() + 180000 // 3分钟
    telemetry().record('breakthrough_prep', 'modal', '突破准备:静坐')
    return true
  }

  if (optionId === 'pill') {
    if (!resources.hasStone(gn(80))) return false
    resources.spendStone(gn(80))
    breakthroughPrepBonus = 0.05
    telemetry().record('breakthrough_prep', 'modal', '突破准备:服丹')
    return true
  }

  return false
}

/** 获取突破准备加成 */
export function getBreakthroughPrepBonus(): number {
  if (breakthroughPrepEndTime && Date.now() < breakthroughPrepEndTime) {
    return 0 // 静坐中,尚未完成
  }
  const bonus = breakthroughPrepBonus
  breakthroughPrepBonus = 0
  breakthroughPrepEndTime = null
  return bonus
}

/** 检查是否在突破准备中 */
export function isPreparingBreakthrough(): boolean {
  return breakthroughPrepEndTime !== null && Date.now() < breakthroughPrepEndTime
}

/** 获取突破准备剩余时间(秒) */
export function getBreakthroughPrepRemaining(): number {
  if (!breakthroughPrepEndTime) return 0
  const remaining = Math.max(0, breakthroughPrepEndTime - Date.now())
  return Math.ceil(remaining / 1000)
}

/** 记录连胜 */
export function recordWin(): void {
  const player = usePlayerStore()
  player.incrementWinStreak()

  // 检查是否触发连胜奖励
  const streak = player.winStreak
  const reward = WIN_STREAK_REWARDS.find(r => r.streak === streak)
  if (reward) {
    const resources = useResourcesStore()
    resources.addStone(gn(reward.stone))
    resources.addSmall('wudao', reward.wudao)
    telemetry().record('win_streak', 'notify', `连胜 ${streak} 场奖励`)
  }
}

/** 记录失败(重置连胜) */
export function recordLoss(): void {
  const player = usePlayerStore()
  player.resetWinStreak()
}

/** 获取当前探索路线配置 */
export function getCurrentRouteConfig() {
  const player = usePlayerStore()
  return ROUTE_CONFIGS[player.selectedRoute]
}

/** 获取灵兽陪行加成 */
export function getCompanionBonus(): {
  eventMod: number
  safeMod: number
  lootMod: number
} {
  const player = usePlayerStore()
  if (!player.companionBeastId) return { eventMod: 1, safeMod: 1, lootMod: 1 }

  // TODO: 根据不同灵兽返回不同加成,暂时简化
  return {
    eventMod: 1.15,
    safeMod: 1.08,
    lootMod: 1.12
  }
}

/** 触发洞府巡游(每日一次) */
export function mayTriggerCaveEvent(): CaveEvent | null {
  if (caveEvent) return caveEvent // 已有未处理事件

  const player = usePlayerStore()
  const today = Math.floor(Date.now() / 86400000)
  if (player.lastCaveEventDay === today) return null // 今日已触发

  // 随机选择一个区域
  const locations = Object.keys(CAVE_EVENT_POOL) as Array<keyof typeof CAVE_EVENT_POOL>
  const location = locations[Math.floor(Math.random() * locations.length)]!
  const pool = CAVE_EVENT_POOL[location]
  if (!pool || pool.length === 0) return null

  const event = pool[Math.floor(Math.random() * pool.length)]!
  const now = Date.now()

  caveEvent = {
    ...event,
    location,
    triggeredAt: now,
    expiresAt: now + 120000 // 2分钟窗口
  }
  telemetry().record('cave_event', 'modal', `洞府:${event.title}`)

  return caveEvent
}

/** 获取当前洞府巡游事件 */
export function getCurrentCaveEvent(): CaveEvent | null {
  if (!caveEvent) return null
  const now = Date.now()
  if (now > caveEvent.expiresAt) {
    caveEvent = null
    return null
  }
  return caveEvent
}

/** 选择洞府巡游选项 */
export function chooseCaveOption(optionIndex: number): void {
  if (!caveEvent || optionIndex >= caveEvent.options.length) return
  const opt = caveEvent.options[optionIndex]!
  const player = usePlayerStore()
  const resources = useResourcesStore()
  const cult = useCultivationStore()

  // 应用奖励
  const now = Date.now()
  if (opt.reward) {
    switch (opt.reward.type) {
      case 'exp':
        player.gainExp(gn(opt.reward.value as number))
        break
      case 'stone':
        resources.addStone(gn(opt.reward.value as number))
        break
      case 'herb':
        resources.addSmall('herb', opt.reward.value as number)
        break
      case 'wudao':
        resources.addSmall('wudao', opt.reward.value as number)
        break
      case 'buff':
        applyCaveBuff(opt.reward.value as string, cult, now)
        break
    }
  }

  // 应用惩罚
  if (opt.penalty) {
    cult.addBuff(`cave_penalty_${Date.now()}`, now)
  }

  const today = Math.floor(Date.now() / 86400000)
  player.markCaveEventToday(today)
  telemetry().record('cave_choose', 'modal', `洞府选择:${opt.label}`)
  caveEvent = null
}

function applyCaveBuff(buffId: string, cult: ReturnType<typeof useCultivationStore>, now: number) {
  cult.addBuff(buffId, now)
}

/** 检查事件是否为连锁事件 */
export function isChainEvent(eventId: string): boolean {
  return CHAIN_EVENT_IDS.some(id => eventId.startsWith(id))
}

/** 获取事件连锁阶段 */
export function getEventChainStage(eventId: string): number {
  const player = usePlayerStore()
  return player.eventChains[eventId] ?? 0
}
