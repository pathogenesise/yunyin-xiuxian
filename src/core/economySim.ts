/**
 * 经济闭环审计(Phase 19)
 * 用真实公式与真实掉落生成,估算各境界时期「每小时生产 vs 每小时消耗」,
 * 找出瓶颈资源 / 死资源 / 纯 UI 噪音。
 *
 * 审计模型假设(集中声明,便于质疑与修正):
 * - 全程挂机历练,战斗间隔与胜率取典型值;
 * - 建筑等级随大境界成长(lv ≈ 2 + 2×境界,受各自上限约束);
 * - 消耗按「该时期内的总沉没成本 / 该时期时长」摊销。
 */
import { toNum } from '@/utils/gnum'
import { mulberry32, RandomService } from '@/utils/random'
import { BUILDINGS } from '@/data/buildings'
import { PILLS } from '@/data/pills'
import { qualityDef } from '@/data/qualities'
import {
  COMPREHEND_PAGE_COST,
  DECOMPOSE_DUST,
  EQUIP_DROP_CHANCE,
  EXPLORE_BATTLE_INTERVAL,
  EXPLORE_EVENT_CHANCE,
  FIELD_HERB_PER_HOUR,
  FIELD_ORE_PER_HOUR,
  LIBRARY_WUDAO_PER_HOUR,
  PAGE_DROP_CHANCE
} from '@/data/constants'
import { buildingCost, gongfaUpCost, qiCap, baseQiRegen, stoneByTier, upgradeCost } from './formulas'
import { generateEquipment } from './equipGen'
import { secondsForMajor } from './progressionSim'

// ---- 挂机行为假设 ----
const WIN_RATE = 0.85
const UPGRADES_PER_HOUR = 3
const CRAFTS_PER_HOUR = 2
const GONGFA_UPS_PER_ERA = 6
const REAL_TIME_FACTOR = 2 // 真实体感 ≈ 纯修炼估算 ×2
/** 沉没成本摊销的最小时长:早期时期极短,玩家实际用数小时慢慢补齐建筑 */
const MIN_AMORTIZE_HOURS = 2

export type AuditResource = 'stone' | 'herb' | 'ore' | 'page' | 'dust' | 'wudao'

export interface ResourceFlow {
  resource: AuditResource
  incomePerHour: number
  sinkPerHour: number
  ratio: number
  verdict: '瓶颈' | '健康' | '过剩' | '闲置'
}

export interface EraAudit {
  major: number
  tier: number
  eraHours: number
  flows: ResourceFlow[]
}

function eraTier(major: number): number {
  return Math.min(20, major * 2 + 2)
}

function buildingLevel(major: number, maxLevel: number): number {
  return Math.min(maxLevel, 2 + 2 * major)
}

function verdictOf(ratio: number): ResourceFlow['verdict'] {
  if (ratio < 0.7) return '瓶颈'
  if (ratio <= 3) return '健康'
  if (ratio <= 10) return '过剩'
  return '闲置'
}

/** 该层级掉落装备的平均分解灵尘(真实生成取样) */
export function avgDustPerDrop(tier: number, samples = 200): number {
  const rng = new RandomService(mulberry32(tier * 131))
  let total = 0
  for (let i = 0; i < samples; i += 1) {
    const inst = generateEquipment(tier, rng)
    total += DECOMPOSE_DUST[qualityDef(inst.quality).rank] ?? 1
  }
  return total / samples
}

/** 单个境界时期的资源流审计 */
export function auditEra(major: number): EraAudit {
  const tier = eraTier(major)
  const eraHours = (secondsForMajor(major, 0) / 3600) * REAL_TIME_FACTOR || 0.1
  const amortizeHours = Math.max(eraHours, MIN_AMORTIZE_HOURS)
  const battlesPerHour = (3600 / EXPLORE_BATTLE_INTERVAL) * (1 - EXPLORE_EVENT_CHANCE)
  const winsPerHour = battlesPerHour * WIN_RATE
  const dropsPerHour = winsPerHour * EQUIP_DROP_CHANCE

  const fieldLv = buildingLevel(major, 15)
  const libLv = buildingLevel(major, 12)

  // ---- 生产 ----
  const stoneIncome = winsPerHour * toNum(stoneByTier(tier, 10))
  const herbIncome = winsPerHour * 0.5 * 2 + fieldLv * FIELD_HERB_PER_HOUR
  const oreIncome = winsPerHour * 0.35 * 1.5 + fieldLv * FIELD_ORE_PER_HOUR
  const pageIncome = winsPerHour * PAGE_DROP_CHANCE * 1.5
  const dustIncome = dropsPerHour * avgDustPerDrop(tier)
  const wudaoIncome = libLv * LIBRARY_WUDAO_PER_HOUR

  // ---- 消耗(时期总量摊销到每小时) ----
  let stoneSinkEra = 0
  let oreSinkEra = 0
  for (const b of BUILDINGS) {
    const from = buildingLevel(major, b.maxLevel)
    const to = buildingLevel(major + 1, b.maxLevel)
    for (let lv = from; lv < to; lv += 1) {
      stoneSinkEra += toNum(buildingCost(b.costBase, lv))
      oreSinkEra += b.costOre * (lv + 1)
    }
  }
  // 功法进修
  const wudaoSinkEra = GONGFA_UPS_PER_ERA * gongfaUpCost(2, 3 + major) + 8
  const pageSinkEra = COMPREHEND_PAGE_COST + GONGFA_UPS_PER_ERA * (3 + major)
  // 炼丹(取该时期可炼配方的平均成本)
  const recipes = PILLS.filter(p => p.recipe && p.minRealm <= major)
  const avgHerbCost = recipes.length ? recipes.reduce((s, p) => s + p.recipe!.herb, 0) / recipes.length : 0
  const avgPillStone = recipes.length
    ? recipes.reduce((s, p) => s + toNum(stoneByTier(Math.max(1, p.minRealm * 2 + 1), p.recipe!.stoneBase / 10)), 0) / recipes.length
    : 0
  // 装备强化
  const up = upgradeCost(3, tier, 3, 0)
  const dustSinkHour = UPGRADES_PER_HOUR * up.dust
  const stoneSinkHour = UPGRADES_PER_HOUR * toNum(up.stone) + CRAFTS_PER_HOUR * avgPillStone + stoneSinkEra / amortizeHours
  const herbSinkHour = CRAFTS_PER_HOUR * avgHerbCost

  const make = (resource: AuditResource, income: number, sink: number): ResourceFlow => {
    const ratio = sink > 0 ? income / sink : Infinity
    return { resource, incomePerHour: income, sinkPerHour: sink, ratio, verdict: verdictOf(ratio) }
  }

  return {
    major,
    tier,
    eraHours,
    flows: [
      make('stone', stoneIncome, stoneSinkHour),
      make('herb', herbIncome, herbSinkHour),
      make('ore', oreIncome, oreSinkEra / amortizeHours),
      make('page', pageIncome, pageSinkEra / amortizeHours),
      make('dust', dustIncome, dustSinkHour),
      make('wudao', wudaoIncome, wudaoSinkEra / amortizeHours)
    ]
  }
}

export function fullEconomyAudit(): EraAudit[] {
  const out: EraAudit[] = []
  for (let m = 0; m <= 8; m += 1) out.push(auditEra(m))
  return out
}

/** 灵气结构体检:回满时长(秒) */
export function qiFillSeconds(major: number): number {
  return qiCap(major, 0) / baseQiRegen(major)
}
