/**
 * 掉落服务 —— 战斗胜利后的奖励结算
 */
import type { EquipmentInstance, RegionDef } from '@/types'
import { rng } from '@/utils/random'
import { mulN } from '@/utils/gnum'
import { qualityDef } from '@/data/qualities'
import { equipmentTemplate } from '@/data/equipment'
import { PILLS } from '@/data/pills'
import { ARTIFACTS, artifactDef } from '@/data/artifacts'
import {
  ARTIFACT_DROP_CHANCE,
  BATTLE_EXP_REQ_PCT,
  DECOMPOSE_DUST,
  EQUIP_DROP_CHANCE,
  PAGE_DROP_CHANCE,
  PILL_DROP_CHANCE
} from '@/data/constants'
import { generateEquipment } from './equipGen'
import { stoneByTier } from './formulas'
import { modOf } from './statsCalc'
import { personalityEffects } from './petPersonality'
import { keepVerdict, shouldAutoRecycle, smartKeepEnabled } from './smartKeep'
import { checkQualityAchievement, collect, track } from './progress'
import { harvestMaterials } from './loreService'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'

export interface DropSummary {
  lines: string[]
}

/** 品质 rank → 分解所得器灵尘 */
function dustOfRank(rank: number): number {
  return DECOMPOSE_DUST[rank] ?? 1
}

export interface AcquireResult {
  /** 给人看的文案(战斗报告/事件/弹窗行) */
  line: string
  /** 是否真正入了行囊(未入 = 自动化尘或满包化尘) */
  bagged: boolean
  /** 本次拾取带来的器灵尘增量(化尘时为尘量,入包为 0) */
  dust: number
}

/**
 * 拾取一件已生成的装备:入包或折算。
 * 无论在线(战斗掉落/事件/镇压)还是离线(挂机结算),都先过自动回收裁决——
 * 命中回收规则的直接化尘不入包;forceKeep(新手馈赠)不受此闸约束。
 * 入包后若行囊已满,智能收纳开启时,值得收藏的新件可挤掉包内与道无缘者。
 */
export function acquireEquipment(inst: EquipmentInstance, opts: { quiet?: boolean; forceKeep?: boolean } = {}): AcquireResult {
  const { quiet = false, forceKeep = false } = opts
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const q = qualityDef(inst.quality)
  const t = equipmentTemplate(inst.templateId)
  const label = `${q.name}·${t?.name ?? '不明之物'}`
  track('equipsGained')
  collect('equip', inst.templateId)
  checkQualityAchievement(q.rank)
  // 自动回收闸:新件先过裁决,命中回收规则的不占行囊,直接化尘
  if (!forceKeep && shouldAutoRecycle(inst)) {
    const dust = dustOfRank(q.rank)
    resources.addSmall('dust', dust)
    return { line: `${label}(自动回收,化作器灵尘×${dust})`, bagged: false, dust }
  }
  if (!inventory.addEquipment(inst)) {
    // 智能收纳:新件值得留则腾位(分解包内最差的「与道无缘」件)
    if (smartKeepEnabled() && keepVerdict(inst).keep) {
      const evictable = inventory.bagItems
        .filter(it => !it.locked && !keepVerdict(it).keep)
        .sort((a, b) => qualityDef(a.quality).rank - qualityDef(b.quality).rank)[0]
      if (evictable) {
        const evictDust = dustOfRank(qualityDef(evictable.quality).rank)
        inventory.removeEquipment(evictable.uid)
        resources.addSmall('dust', evictDust)
        if (inventory.addEquipment(inst)) {
          return {
            line: `${label}(收纳规则腾位:${equipmentTemplate(evictable.templateId)?.name ?? '旧物'}化尘×${evictDust})`,
            bagged: true,
            dust: evictDust
          }
        }
      }
    }
    const dust = dustOfRank(q.rank)
    resources.addSmall('dust', dust)
    return { line: `${label}(行囊已满,化作器灵尘×${dust})`, bagged: false, dust }
  }
  if (!quiet && q.rank >= 3) {
    ui.toast(`灵光乍现,拾得「${label}」`, 'rare')
  }
  return { line: label, bagged: true, dust: 0 }
}

/** 获得法宝:重复则折算悟道点 */
export function acquireArtifact(defId: string, quiet = false): string {
  const inventory = useInventoryStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const def = artifactDef(defId)
  if (!def) return ''
  collect('artifact', defId)
  if (!inventory.addArtifact(defId)) {
    resources.addSmall('wudao', 10)
    return `法宝「${def.name}」(已拥有,化作悟道点×10)`
  }
  if (!quiet) ui.toast(`天降机缘!获得法宝「${def.name}」`, 'rare')
  return `法宝「${def.name}」`
}

/** 随机一件当前境界可用的掉落丹药 */
export function randomDropPill(major: number): string | null {
  const pool = PILLS.filter(p => p.minRealm <= major && !p.recipe)
  if (pool.length === 0) return null
  const picked = rng.weighted(pool, p => 100 / (1 + qualityDef(p.quality).rank * 2))
  return picked.id
}

/** 随机一件玩家层级可及的法宝 */
export function randomDropArtifact(tier: number): string | null {
  const pool = ARTIFACTS.filter(a => a.minTier <= tier)
  if (pool.length === 0) return null
  return rng.weighted(pool, a => 100 / (1 + qualityDef(a.quality).rank * 1.5)).id
}

/** 战斗胜利掉落 */
export function afterWin(region: RegionDef, rewardMult: number, isBoss: boolean): DropSummary {
  const player = usePlayerStore()
  const resources = useResourcesStore()
  const inventory = useInventoryStore()
  const mods = player.finalStats.mods
  const lines: string[] = []
  const tier = region.tier
  const bossMult = isBoss ? 4 : 1
  const doubled = rng.chance(modOf(mods, 'doubleDropRate')) ? 2 : 1
  if (doubled === 2) lines.push('福缘深厚,战利品翻倍!')

  // 灵石
  const stoneAmt = rng.float(0.8, 1.2) * rewardMult * bossMult * doubled * (1 + modOf(mods, 'spiritStoneGain'))
  const stone = stoneByTier(tier, 10 * stoneAmt)
  resources.addStone(stone)

  // 战斗修为
  const expPct = BATTLE_EXP_REQ_PCT * rewardMult * (isBoss ? 4 : 1) * doubled * (1 + modOf(mods, 'expGain'))
  player.gainExp(mulN(player.expReq, expPct))

  // 材料 —— 数量进标量库存,同时抽出"你到底捡到了什么"推进认知
  if (rng.chance(0.5)) {
    const n = rng.int(1, 3) * doubled
    resources.addSmall('herb', n)
    harvestMaterials(tier, 'herb', n)
  }
  if (rng.chance(0.35)) {
    const n = rng.int(1, 2) * doubled
    resources.addSmall('ore', n)
    harvestMaterials(tier, 'ore', n)
  }
  if (rng.chance(PAGE_DROP_CHANCE * rewardMult)) {
    const n = rng.int(1, 2) * doubled
    resources.addSmall('page', n)
    lines.push(`功法残页×${n}`)
  }

  // 装备 —— 品质 luck 并入灵兽性格的掉落倾向:
  // 贪宝(dropLuck>0)更易出稀有,谨慎(dropLuck<0)则稍稍寻常 —— 图鉴承诺,此处兑现
  const luck = modOf(mods, 'luck') + personalityEffects(player.petId).dropLuck
  const equipChance = EQUIP_DROP_CHANCE * rewardMult * (1 + modOf(mods, 'dropRate')) * (isBoss ? 2.5 : 1)
  for (let i = 0; i < doubled; i += 1) {
    if (rng.chance(Math.min(0.9, equipChance)) || (isBoss && i === 0)) {
      const inst = generateEquipment(tier, rng, { luck, minQualityRank: isBoss ? 1 : 0 })
      lines.push(acquireEquipment(inst).line)
    }
  }

  // 丹药
  if (rng.chance(PILL_DROP_CHANCE * rewardMult * (isBoss ? 3 : 1))) {
    const pillId = randomDropPill(player.major)
    if (pillId) {
      inventory.addPill(pillId, 1)
      collect('pill', pillId)
      const def = PILLS.find(p => p.id === pillId)
      lines.push(`丹药「${def?.name ?? ''}」`)
    }
  }

  // 法宝(稀有)
  if (rng.chance(ARTIFACT_DROP_CHANCE * (isBoss ? 6 : 1) * (1 + luck))) {
    const artId = randomDropArtifact(tier)
    if (artId) lines.push(acquireArtifact(artId))
  }

  return { lines }
}
