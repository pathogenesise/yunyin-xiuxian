/* eslint-disable no-console -- 梯级读数是要给人看的 */
/**
 * 历练三档触发(际遇 / 机缘 / 奇缘)审计
 *
 * 守三件事:
 *   ① 每一件能弹窗的事都归得进某一档,且三档互斥(不许有第四档,也不许漏)
 *   ② 三档的稀度是**真的梯级**(际遇 > 奇缘 > 机缘),不是三个各自为政的数字
 *   ③ 界面读的是同一份口径 —— 不许在弹窗里另抄一张档位表
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EVENTS, FORTUNE_EVENTS } from '@/data/events'
import { CHAIN_EVENTS } from '@/data/chains'
import { EXPLORE_EVENT_CHANCE } from '@/data/constants'
import { EVENT_TIERS, eventTierDef, eventTierOf, tierChances, tierEncountersPerTrigger, tierOddsText } from './eventTier'

const PILLARS: string[] = ['jingyu', 'jiyuan', 'qiyuan']

describe('三档触发 · 分类', () => {
  it('每一件能弹窗的事都归得进某一档', () => {
    for (const ev of [...EVENTS, ...FORTUNE_EVENTS]) {
      expect(PILLARS).toContain(eventTierOf(ev.id))
    }
  })

  it('三档互斥:奇缘的事件不会被当成机缘,反之亦然', () => {
    for (const ev of CHAIN_EVENTS) {
      expect(eventTierOf(ev.id), `${ev.id} 是奇缘阶段事件`).toBe('qiyuan')
    }
    for (const ev of FORTUNE_EVENTS) {
      expect(eventTierOf(ev.id), `${ev.id} 是机缘`).toBe('jiyuan')
    }
    // 寻常事件(既不在链上,也不带 ft_ 前缀)一律是际遇
    const chainIds = new Set(CHAIN_EVENTS.map(e => e.id))
    const ordinary = EVENTS.filter(e => !chainIds.has(e.id) && !e.id.startsWith('ft_'))
    expect(ordinary.length, '一件寻常际遇都没有?那这个池子只剩稀有货了').toBeGreaterThan(0)
    for (const ev of ordinary) expect(eventTierOf(ev.id)).toBe('jingyu')
  })
})

describe('三档触发 · 稀度梯级', () => {
  it('际遇 > 奇缘 > 机缘 —— 越罕见的一档价值越高', () => {
    const c = tierChances()
    console.log(
      `\n  每程触发概率:际遇 ${(c.jingyu * 100).toFixed(1)}% · 奇缘 ${(c.qiyuan * 100).toFixed(1)}% · 机缘 ${(c.jiyuan * 100).toFixed(2)}%`
    )
    expect(c.jingyu).toBeGreaterThan(c.qiyuan)
    expect(c.qiyuan).toBeGreaterThan(c.jiyuan)
  })

  it('档位越罕见,期望次数越大 —— rarity 序不许与概率序打架', () => {
    const byRarity = [...EVENT_TIERS].sort((a, b) => a.rarity - b.rarity)
    const waits = byRarity.map(t => tierEncountersPerTrigger(t.id))
    for (let i = 1; i < waits.length; i += 1) {
      expect(waits[i], `${byRarity[i]!.name} 比 ${byRarity[i - 1]!.name} 更罕见,等的时间却更短`).toBeGreaterThan(
        waits[i - 1]!
      )
    }
    // 机缘是「千载难逢」:每程 2% 不到
    expect(tierChances().jiyuan).toBeLessThan(0.01)
  })

  it('三档各自说得出「多久见一次」,且文案不手写数字', () => {
    for (const t of EVENT_TIERS) {
      const text = tierOddsText(t.id)
      expect(text).toContain('程')
    }
    // 际遇最勤:约每 6 程(1/0.16);机缘最疏:约每 310 程
    expect(tierOddsText('jingyu')).toBe(`约每 ${Math.round(1 / EXPLORE_EVENT_CHANCE)} 程一次`)
    expect(tierOddsText('jiyuan')).not.toBe(tierOddsText('qiyuan'))
  })

  it('三档的名字、说明、颜色各不相同(否则「区分度」只是嘴上说)', () => {
    const names = new Set(EVENT_TIERS.map(t => t.name))
    const colors = new Set(EVENT_TIERS.map(t => t.color))
    const briefs = new Set(EVENT_TIERS.map(t => t.brief))
    expect(names.size).toBe(3)
    expect(colors.size).toBe(3)
    expect(briefs.size).toBe(3)
    expect(eventTierDef('qiyuan').name).toBe('奇缘')
    expect(eventTierDef('jiyuan').name).toBe('机缘')
    expect(eventTierDef('jingyu').name).toBe('际遇')
  })
})

describe('三档触发 · 弹窗接线', () => {
  const src = (p: string): string => readFileSync(resolve(__dirname, p), 'utf8')

  it('弹窗读的是 core/eventTier,不是自己那张档位表', () => {
    const dialog = src('../components/adventure/EventDialog.vue')
    expect(dialog, '档位名必须取自 eventTierDef').toContain('eventTierDef(')
    expect(dialog, '事件属于哪一档必须取自 eventTierOf').toContain('eventTierOf(')
    expect(dialog, '概率文案必须取自 tierOddsText').toContain('tierOddsText(')
    // 从前三档共用「际遇」一个标题 —— 这条红线防它回来
    expect(dialog, '弹窗标题又被写死成「际遇」了').not.toMatch(/:title="result \? '际遇'/)
    // 出发之前就该知道有三档 —— 只在弹窗里说,等于玩家出发时仍以为是"随机撞见同一件事"
    const view = src('../views/AdventureView.vue')
    expect(view, '历练页该把三档与各自稀度摆在出发前').toContain('EVENT_TIERS')
    expect(view, '档位胶囊的文字该取自同一份概率口径').toContain('tierOddsText(')
  })

  it('概率常量只有一份 —— 引擎与界面不许各写一个', () => {
    const engine = src('./eventEngine.ts')
    expect(engine).toContain('CHAIN_STAGE_CHANCE')
    expect(engine).toContain('FORTUNE_CHANCE')
    expect(engine, '概率又被写死在引擎里了').not.toMatch(/const (FORTUNE_CHANCE|CHAIN_STAGE_CHANCE)\s*=/)
  })
})
