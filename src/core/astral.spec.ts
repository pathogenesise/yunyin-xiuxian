/* eslint-disable no-console */
/**
 * Phase 31.0 S5:astral 共鸣(星斗/仙甲/混沌)进战斗 —— 开战时护盾 +5%
 *
 * 铁壁共鸣(ironwall)有接线与测试,astral 却只停留在「声明」:
 *   - equipSet.ts 定义了三套 astral(星斗/仙甲/混沌),UI 显示「共鸣」;
 *   - 但 playerSnap 只把 ironwall 物化成 ironwallBrace,combat 开战护盾只读
 *     mods.shieldOnStart(由词条/功法提供)——astral 套装凑齐两件,战斗毫无变化。
 *
 * 这里钉住承诺:两件星斗套 → buildPlayerSnap 的 mods 带上 shieldOnStart +5%,
 * 真打一场,开局「灵光护体」应声而起(护盾吸收掉首击的绝大部分)。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { EquipmentInstance, QualityId } from '@/types'
import { mulberry32, RandomService } from '@/utils/random'
import { resolveCombat, makeEnemySnap } from './combat'
import { buildPlayerSnap } from './playerSnap'
import { enemyDef } from '@/data/enemies'
import { useInventoryStore } from '@/stores/inventory'

function inst(uid: string, templateId: string): EquipmentInstance {
  return { uid, templateId, quality: 'fine' as QualityId, tier: 14, level: 0, affixes: [] }
}

/** 两件星斗套(星辰冠 + 星罗法衣)入背包并佩戴 */
function wearStarDou(): void {
  const inv = useInventoryStore()
  inv.items = [inst('hat-xingchen', 'h_xingchen'), inst('body-xingluo', 'b_xingluo')]
  inv.equipped = { head: 'hat-xingchen', body: 'body-xingluo' } as never
}

describe('astral 共鸣进战斗(开战护盾+5%)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('两件星斗套 → buildPlayerSnap 的 mods 带上 shieldOnStart +5%', () => {
    wearStarDou()
    const snap = buildPlayerSnap()
    // 星斗套两件在身:开战护盾 = astral 的 5%(基础 0)
    expect(snap.mods.shieldOnStart ?? 0).toBeGreaterThanOrEqual(0.05)
  })

  it('单件星斗不会触发共鸣(件数不足)', () => {
    const inv = useInventoryStore()
    inv.items = [inst('hat-xingchen', 'h_xingchen')]
    inv.equipped = { head: 'hat-xingchen' } as never

    const snap = buildPlayerSnap()
    expect(snap.mods.shieldOnStart ?? 0).toBeLessThan(0.03)
  })

  it('真打一场:开战即见「灵光护体」,护盾吸收首击大部分', () => {
    wearStarDou()
    const snap = buildPlayerSnap()
    // 敌人用最低档狼,攻击拉到一时满血,让护盾能挡住第一击
    const enemy = makeEnemySnap(enemyDef('e_wolf')!, 1, 1)
    enemy.attack = snap.maxHp
    const res = resolveCombat(snap, enemy, new RandomService(mulberry32(9)))

    const logText = res.log.map(l => l.text).join('\n')
    console.log(logText)
    expect(logText.includes('灵光护体')).toBe(true)
  })
})
