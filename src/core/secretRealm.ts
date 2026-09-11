/**
 * 短期秘境服务(Phase 31.0 S3 · Phase 34.9 接上玩法)
 *
 * 结构:进入(付入口代价)→ 随机规则 1~2 条 → 三层 → 最终宝藏。
 * 复用 resolveCombat / makeEnemySnap / stoneByTier / generateEquipment,不建新数值体系。
 *
 * 本轮之前这里只有骨架:定义了状态与目录,却没有任何入口 ——
 * 玩家进不去,player.secretRealm 永远是 null,而轮回清单还在交代它的去留。
 */
import type { CombatantSnap, CombatRules, GNum } from '@/types'
import { formatGN } from '@/utils/format'
import { rng } from '@/utils/random'
import { ENEMIES, enemyDef } from '@/data/enemies'
import { REGIONS } from '@/data/regions'
import { SECRET_LAYERS, SECRET_MAX_LOSSES, SECRET_REALMS, SECRET_RULES, secretRealmDef, type SecretRealmDef } from '@/data/secretRealms'
import { makeEnemySnap, resolveCombat } from './combat'
import { buildPlayerSnap } from './playerSnap'
import { currentDaoRules } from './endgameService'
import { stoneByTier } from './formulas'
import { generateEquipment } from './equipGen'
import { acquireEquipment } from './loot'
import { mergeRules } from './gauntlet'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useUiStore } from '@/stores/ui'

export interface SecretRealmState {
  /** 秘境定义 id */
  realmId: string
  /** 进入时刻 */
  enteredAt: number
  /** 当前层 1~3 */
  layer: number
  /** 已胜场 */
  wins: number
  /** 已失败次数(失败 2 次强制出) */
  losses: number
  /** 累计战利描述 */
  spoils: string[]
  /** 本趟的随机规则(1~2 条,文本给玩家看、规则给引擎用) */
  rules: string[]
  /** 层间携带的气血比例 */
  carriedHpPct: number
  /** 结束标记(结束后即清空状态,故仅在一次结算内为真) */
  finished: boolean
}

/** 玩家当前地界层级(入口代价按它折算) */
export function tierOfMajor(major: number): number {
  const pool = REGIONS.filter(r => r.minRealm <= major)
  return pool.length > 0 ? Math.max(...pool.map(r => r.tier)) : 1
}

/** 入口代价(灵石,按当前层级折算) */
export function entryStoneCost(def: SecretRealmDef, major: number): GNum {
  return stoneByTier(tierOfMajor(major), def.entryStone)
}

/** 是否有秘境可探(元婴起) */
export function realmUnlock(): boolean {
  const player = usePlayerStore()
  return SECRET_REALMS.some(r => player.major >= r.minMajor)
}

/** 可以进的秘境(未达门槛的不列出) */
export function availableRealms(): SecretRealmDef[] {
  const player = usePlayerStore()
  return SECRET_REALMS.filter(r => player.major >= r.minMajor)
}

/** 当前秘境(无则 null) */
export function currentRealm(): SecretRealmState | null {
  return usePlayerStore().secretRealm
}

export interface EnterResult {
  ok: boolean
  reason?: string
}

/** 进秘境:验门槛、付灵石、掷规则、落状态 */
export function enterSecretRealm(defId: string): EnterResult {
  const player = usePlayerStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const def = secretRealmDef(defId)
  if (!def) return { ok: false, reason: '此境不存在' }
  if (player.major < def.minMajor) return { ok: false, reason: `${def.name}需更高境界` }
  if (player.secretRealm) return { ok: false, reason: '已在秘境之中' }
  const cost = entryStoneCost(def, player.major)
  if (!resources.hasStone(cost)) {
    ui.toast(`灵石不足 ${formatGN(cost)}`, 'warn')
    return { ok: false, reason: '灵石不足' }
  }
  resources.spendStone(cost)
  // 随机规则 1~2 条,不重复
  const n = rng.int(1, 2)
  const pool = [...SECRET_RULES]
  const texts: string[] = []
  while (texts.length < n && pool.length > 0) {
    const pick = pool.splice(rng.int(0, pool.length - 1), 1)[0]!
    texts.push(pick.text)
  }
  player.setSecretRealm({
    realmId: def.id,
    enteredAt: Date.now(),
    layer: 1,
    wins: 0,
    losses: 0,
    spoils: [],
    rules: texts,
    carriedHpPct: 1,
    finished: false
  })
  return { ok: true }
}

/** 本趟生效的战斗规则:道途 + 秘境自带 + 随机规则(+ 层级递进的凶险) */
export function secretFightRules(state: SecretRealmState, layer = state.layer): CombatRules {
  const def = secretRealmDef(state.realmId)
  const rolled = state.rules
    .map(text => SECRET_RULES.find(r => r.text === text)?.rules)
    .filter((r): r is CombatRules => !!r)
  const escalation: CombatRules = { enemyAtkMult: 1 + 0.1 * (layer - 1), enemyHpMult: 1 + 0.12 * (layer - 1) }
  const base = mergeRules(currentDaoRules(), def?.rules)
  const withRolled = rolled.reduce<CombatRules | undefined>((acc, cur) => mergeRules(acc, cur), base)
  return mergeRules(withRolled, escalation) ?? {}
}

export interface SecretLayerResult {
  win: boolean
  /** 是否整趟结束(通关或被逐出) */
  finished: boolean
  cleared: boolean
  /** 本层战利/结果描述 */
  lines: string[]
}

/** 打一层 */
export function fightSecretLayer(): SecretLayerResult | null {
  const player = usePlayerStore()
  const resources = useResourcesStore()
  const ui = useUiStore()
  const state = player.secretRealm
  if (!state) return null
  const def = secretRealmDef(state.realmId)
  if (!def) return null

  const tier = tierOfMajor(player.major)
  const pool = ENEMIES.filter(e => e.tier <= tier && e.tier >= Math.max(1, tier - 3))
  const foeDef = pool.length > 0 ? rng.pick(pool) : enemyDef(ENEMIES[0]!.id)!
  const snap = makeEnemySnap(foeDef, tier, 1 + 0.12 * (state.layer - 1))
  const playerSnap: CombatantSnap = buildPlayerSnap()
  const rules = { ...secretFightRules(state), playerStartHpPct: state.carriedHpPct }
  const result = resolveCombat(playerSnap, snap, rng, rules)
  const lines: string[] = []

  if (result.win) {
    // 战利:灵石 + 材料,随层数与本境倍率上浮
    const stone = stoneByTier(tier, (12 + 6 * state.layer) * def.rewardMult)
    resources.addStone(stone)
    const mat = 2 + state.layer
    resources.addSmall('herb', mat)
    lines.push(`胜 ${foeDef.name} · 灵石 +${formatGN(stone)} · 灵草 +${mat}`)
    const nextLayer = state.layer + 1
    if (nextLayer > SECRET_LAYERS) {
      // 通关:最终宝藏
      const inst = generateEquipment(tier, rng, { minQualityRank: 2 })
      lines.push(`破境而出!${acquireEquipment(inst).line}`)
      resources.addSmall('wudao', 3)
      lines.push('悟道点 +3')
      player.setSecretRealm(null)
      ui.toast(`${def.name}已探尽`, 'rare')
      return { win: true, finished: true, cleared: true, lines }
    }
    const carried = Math.min(1, result.playerHpPct + def.healBetweenPct)
    player.setSecretRealm({
      ...state,
      layer: nextLayer,
      wins: state.wins + 1,
      spoils: [...state.spoils, ...lines],
      carriedHpPct: Math.max(0.05, carried)
    })
    return { win: true, finished: false, cleared: false, lines }
  }

  const losses = state.losses + 1
  lines.push(`不敌 ${foeDef.name} · 气血余 ${Math.round(result.playerHpPct * 100)}%`)
  if (losses >= SECRET_MAX_LOSSES) {
    player.setSecretRealm(null)
    lines.push('连败两场,被逐出秘境')
    ui.toast('你被逐出了秘境', 'warn')
    return { win: false, finished: true, cleared: false, lines }
  }
  player.setSecretRealm({
    ...state,
    losses,
    spoils: [...state.spoils, ...lines],
    carriedHpPct: Math.max(0.05, result.playerHpPct + def.healBetweenPct)
  })
  return { win: false, finished: false, cleared: false, lines }
}

/** 离开秘境(结束/放弃):已得的战利不退 */
export function abandonRealm(): void {
  usePlayerStore().setSecretRealm(null)
}

export { SECRET_LAYERS, SECRET_MAX_LOSSES, SECRET_REALMS, secretRealmDef }
