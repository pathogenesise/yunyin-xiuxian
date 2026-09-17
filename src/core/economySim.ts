/**
 * 经济闭环审计(Phase 19)
 * 用真实公式与真实掉落生成,估算各境界时期「每小时生产 vs 每小时消耗」,
 * 找出瓶颈资源 / 死资源 / 纯 UI 噪音。
 *
 * 审计模型假设(集中声明,便于质疑与修正):
 * - 全程挂机历练,战斗间隔与胜率取典型值;
 * - 建筑等级随大境界成长(lv ≈ 2 + 2×境界,受各自上限约束);
 * - 消耗按「该时期内的总沉没成本 / 该时期时长」摊销。
 *
 * Phase 40 补全两处(见 ISS-209):
 * - **修为也进表**。它此前不在六条资源流里,而它恰是最大的一条收入 ——
 *   口径随 Phase 39 统一:一切即时修为 = 修速 × 一段等效闭关时长,故这一行
 *   量的是「等效闭关秒/小时」,收入 = 挂机 + 历练两条线(core/expIncome 同一把尺子),
 *   消耗 = 通关本境的修为需求。比值全程恒定,不随境界漂移 —— 这正是要守的性质。
 * - **界外十二境一并体检**(0~20 境,不再只跑人间界 0~8)。区域层级取自
 *   data/regions 的 maxTierForMajor —— 从前这里自写 `min(20, 2m+2)`,把界外
 *   十二境全压死在层级 20,收入那一半先错了 1.9^12。
 *
 * 读界外的表须知:那一段的**出口**多半不在建筑上(建筑早已封顶),而在天道熔炉
 * (玄铁/残页/器灵尘 → 道源)。本模型尚未把熔炉出口计入,故界外读到的高闲置
 * 是「没有出口模型」的读数,不等于「这些资源真的没用」—— 见 ISS-210。
 */
import { toNum } from '@/utils/gnum'
import { mulberry32, RandomService } from '@/utils/random'
import { BUILDINGS } from '@/data/buildings'
import { PILLS } from '@/data/pills'
import { qualityDef } from '@/data/qualities'
import { MAX_MAJOR } from '@/data/realms'
import { maxTierForMajor } from '@/data/regions'
import {
  COMPREHEND_PAGE_COST,
  DECOMPOSE_DUST,
  EQUIP_DROP_CHANCE,
  FIELD_HERB_PER_HOUR,
  FIELD_ORE_PER_HOUR,
  LIBRARY_WUDAO_PER_HOUR,
  PAGE_DROP_CHANCE
} from '@/data/constants'
import { buildingCost, gongfaUpCost, qiCap, baseQiRegen, stoneByTier, upgradeCost } from './formulas'
import { generateEquipment } from './equipGen'
import { secondsForMajor } from './progressionSim'
import { tripExpSecsPerHour, winsPerHour } from './expIncome'

// ---- 挂机行为假设 ----
const UPGRADES_PER_HOUR = 3
const CRAFTS_PER_HOUR = 2
const GONGFA_UPS_PER_ERA = 6
const REAL_TIME_FACTOR = 2 // 真实体感 ≈ 纯修炼估算 ×2
/** 沉没成本摊销的最小时长:早期时期极短,玩家实际用数小时慢慢补齐建筑 */
const MIN_AMORTIZE_HOURS = 2

export type AuditResource = 'stone' | 'herb' | 'ore' | 'page' | 'dust' | 'wudao' | 'exp'

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
  const tier = maxTierForMajor(major)
  const eraHours = (secondsForMajor(major, 0) / 3600) * REAL_TIME_FACTOR || 0.1
  const amortizeHours = Math.max(eraHours, MIN_AMORTIZE_HOURS)
  /**
   * 遭遇速率取自 core/expIncome —— 那是"一次遭遇值多少"的唯一口径所在地,
   * 这里再写一遍就会出现两个「全时历练 = ×N」的说法(本审计第一版正是如此:
   * 一处按全胜算、一处按 0.85 胜率算,同一句话读出 1.64 与 1.51 两个数)。
   */
  const winsThisHour = winsPerHour()
  const dropsPerHour = winsThisHour * EQUIP_DROP_CHANCE

  const fieldLv = buildingLevel(major, 15)
  const libLv = buildingLevel(major, 12)

  // ---- 生产 ----
  const stoneIncome = winsThisHour * toNum(stoneByTier(tier, 10))
  const herbIncome = winsThisHour * 0.5 * 2 + fieldLv * FIELD_HERB_PER_HOUR
  const oreIncome = winsThisHour * 0.35 * 1.5 + fieldLv * FIELD_ORE_PER_HOUR
  const pageIncome = winsThisHour * PAGE_DROP_CHANCE * 1.5
  const dustIncome = dropsPerHour * avgDustPerDrop(tier)
  const wudaoIncome = libLv * LIBRARY_WUDAO_PER_HOUR
  /**
   * 修为收入 = 挂机(底:1.0× 修速 = 3600 等效秒/小时)+ 历练(战斗胜场与际遇),
   * 两条线都随修速缩放,故这一行的比值在任何境界都该是同一个数 —— 判据据此断。
   * 速率与时长都取自 core/expIncome(同一把尺子)。
   */
  const expIncome = 3600 + tripExpSecsPerHour()

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
  /**
   * 修为消耗 = 通关本境所需的等效闭关秒 ÷ 本境时长。
   *
   * 这里**不套 MIN_AMORTIZE_HOURS**:那道下限是给建筑的(「玩家用数小时慢慢补齐」),
   * 而修为需求本来就摊在本境这一段时长里,早期一境只有十几分钟也照摊。
   */
  const expSinkHour = secondsForMajor(major, 0) / eraHours

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
      make('wudao', wudaoIncome, wudaoSinkEra / amortizeHours),
      make('exp', expIncome, expSinkHour)
    ]
  }
}

export function fullEconomyAudit(): EraAudit[] {
  const out: EraAudit[] = []
  for (let m = 0; m <= MAX_MAJOR; m += 1) out.push(auditEra(m))
  return out
}

/** 灵气结构体检:回满时长(秒) */
export function qiFillSeconds(major: number): number {
  return qiCap(major, 0) / baseQiRegen(major)
}
