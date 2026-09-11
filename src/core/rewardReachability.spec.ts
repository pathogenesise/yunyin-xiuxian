/**
 * 奖励可达性 —— 称号与丹药奖励不能是"看得见拿不到"
 *
 * 本轮实测:`ti_lianqi`(炼气修士)在称号页里摆着,desc 写着「于炼气境站稳脚跟」,
 * 却没有任何成就/任务发它 —— 玩家永远拿不到。同类的还有一处死分支:
 * evalCond 支持 `realm_<major>_<sub>` 型 custom 条件,但 checkAchievements 把所有
 * custom 一并跳过,于是那条分支从未被求值。
 *
 * 故这里钉两条:
 *   一 每个称号都必须有获取路径(有成就/任务/轮回等发放点);
 *   二 发放点引用的称号 id 必须真实存在 —— grantReward 对不存在的 titleId 是**静默丢弃**,
 *      对不存在的 pillId 则直接抛错(非空断言),两种都要在数据层拦住。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { TITLES, titleDef } from '@/data/titles'
import { ACHIEVEMENTS } from '@/data/achievements'
import { MAIN_QUESTS, DAILY_TASKS } from '@/data/quests'
import { PILLS, pillDef } from '@/data/pills'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useQuestsStore } from '@/stores/quests'
import { trackRealm } from './progress'

const SRC = resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    // 排除 spec:用例里的示例字符串不是游戏内的发放点
    else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith('.spec.ts')) out.push(full)
  }
  return out
}

/** 全部源码(含数据)里出现 `titleId: 'x'` 的地方 —— 那就是发放点 */
const corpus = walk(SRC).map(f => readFileSync(f, 'utf8')).join('\n')
const grantedTitles = new Set([...corpus.matchAll(/titleId:\s*'([^']+)'/g)].map(m => m[1]!))

describe('奖励可达性 · 称号', () => {
  it('每个称号都有获取路径 —— 不许有只能看不能得的称号', () => {
    const orphans = TITLES.filter(t => !grantedTitles.has(t.id)).map(t => `${t.name}(${t.id})`)
    expect(orphans, `这些称号没有任何发放点:${orphans.join('、')}`).toEqual([])
  })

  it('发放点引用的称号 id 全部存在', () => {
    const ids = new Set(TITLES.map(t => t.id))
    const bad = [...grantedTitles].filter(id => !ids.has(id))
    expect(bad, `这些发放点指向不存在的称号:${bad.join('、')}`).toEqual([])
    expect(titleDef('ti_lianqi')?.name).toBe('炼气修士')
  })
})

describe('奖励可达性 · 丹药与成就条件', () => {
  it('奖励里点名的丹药全部存在(不存在的会当场抛错)', () => {
    const bundles = [...ACHIEVEMENTS.map(a => a.reward), ...MAIN_QUESTS.map(q => q.reward), ...DAILY_TASKS.map(t => t.reward)]
    for (const b of bundles) {
      if (b?.pillId) expect(pillDef(b.pillId), `奖励引用了不存在的丹药 ${b.pillId}`).toBeDefined()
    }
    expect(PILLS.length).toBeGreaterThan(0)
  })

  it('成就里的 `realm_<major>_<sub>` 条件必须真的有人求值(不是死分支)', () => {
    const customRealm = ACHIEVEMENTS.filter(a => a.cond.type === 'custom' && /^realm_\d+_\d+$/.test(a.cond.key))
    expect(customRealm.length, '没有这类条件时,这条判据失去意义').toBeGreaterThan(0)
    const src = readFileSync(join(SRC, 'core/progress.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    // checkAchievements 必须放过这类 custom 条件交给 evalCond,而不是把 custom 一律跳过
    expect(src).toContain("/^realm_\\d+_\\d+$/.test(def.cond.key)")
  })

  it('炼气修至圆满那一刻,「炼气修士」真的到手(不只是数据上有个引用)', () => {
    setActivePinia(createPinia())
    const player = usePlayerStore()
    const quests = useQuestsStore()
    player.major = 0
    player.sub = 8
    trackRealm()
    expect(quests.hasAchieved('a_lianqi_full'), '九层不该解锁').toBe(false)
    player.sub = 9 // 圆满
    trackRealm()
    expect(quests.hasAchieved('a_lianqi_full')).toBe(true)
    expect(quests.titlesOwned).toContain('ti_lianqi')
  })
})
