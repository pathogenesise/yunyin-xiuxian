/**
 * Phase 29 前期节奏遥测 —— 互动密度与决策价值的统计基础设施
 *
 * 目标不是"让前 30 分钟发生更多事情",而是:
 * "让玩家在更少的打断下,做更多有意义的决定。"
 *
 * 三种事件分类:
 * - modal  : 打断型(弹窗,需要玩家立即处理) → 顿悟/闭关确认/洞府巡游
 * - notify : 提示型(toast,不需要立即处理)  → 连胜奖励/奇遇解锁
 * - ambient: 环境型(无感知,背景自动进行)   → 素材自动收集/生产
 *
 * 互动密度核心指标(全部自动落盘):
 * - avgInterval   平均事件间隔
 * - p50/p90       间隔分位数(90%的事件间隔小于 P90)
 * - minInterval   最短间隔
 * - burstCount    60 秒内连续出现 ≥2 个需要处理事件的簇数
 * - maxConsecutive最大连续弹窗次数
 *
 * 放置游戏防扰民红线(阶段目标,越界即触发警告):
 * - P90 间隔 < 30s → 事件过密,弹窗会互相抢注意力
 * - burstCount > 6 次/30分钟 → 存在"连弹风暴"
 */
import { ref } from 'vue'
import { persistConfig } from '@/utils/storage'
import { defineStore } from 'pinia'

export type InteractionKind = 'modal' | 'notify' | 'ambient'

export interface InteractionEvent {
  /** 事件类型 ID(如 enlightenment / caveEvent / winStreak) */
  type: string
  kind: InteractionKind
  /** 可读描述(用于报告输出) */
  label: string
  at: number
}

interface DensityReport {
  total: number
  avgInterval: number
  p50: number
  p90: number
  minInterval: number
  burstCount: number
  maxConsecutive: number
  byKind: Record<InteractionKind, number>
}

/** 峰值前 30 分钟滚动窗口的遥测 */
export const usePacingTelemetry = defineStore(
  'pacingTelemetry',
  () => {
    /** 实际记录的事件时间戳序列(最近 120 条,滚动) */
    const events = ref<InteractionEvent[]>([])
    /** 玩家是否已同意遥测(默认开启) */
    const enabled = ref(true)

    function record(type: string, kind: InteractionKind, label: string): void {
      if (!enabled.value) return
      const now = Date.now()
      events.value = [...events.value.slice(-119), { type, kind, label, at: now }]
    }

    /** 生成密度报告(基于最近 30 分钟) */
    function buildReport(): DensityReport | null {
      const now = Date.now()
      const recent = events.value.filter(e => now - e.at < 30 * 60 * 1000)
      if (recent.length < 3) return null

      const intervals: number[] = []
      for (let i = 1; i < recent.length; i += 1) {
        intervals.push(recent[i]!.at - recent[i - 1]!.at)
      }
      intervals.sort((a, b) => a - b)

      const pct = (p: number): number => intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * p))]!
      const burstCount = recent.reduce((count, e, i) => {
        if (i === 0) return count
        const gap = e.at - recent[i - 1]!.at
        return gap < 60 * 1000 ? count + 1 : count
      }, 0)

      let maxConsecutive = 0
      let consecutive = 0
      for (let i = 1; i < recent.length; i += 1) {
        const gap = recent[i]!.at - recent[i - 1]!.at
        if (gap < 60 * 1000) {
          consecutive += 1
          maxConsecutive = Math.max(maxConsecutive, consecutive)
        } else {
          consecutive = 0
        }
      }

      return {
        total: recent.length,
        avgInterval: Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length),
        p50: pct(0.5),
        p90: pct(0.9),
        minInterval: intervals[0]!,
        burstCount,
        maxConsecutive,
        byKind: {
          modal: recent.filter(e => e.kind === 'modal').length,
          notify: recent.filter(e => e.kind === 'notify').length,
          ambient: recent.filter(e => e.kind === 'ambient').length
        }
      }
    }

    /** 全部清空(新赛季/测试) */
    function clear(): void {
      events.value = []
    }

    return { events, enabled, record, buildReport, clear }
  },
  { persist: persistConfig('pacing') }
)
