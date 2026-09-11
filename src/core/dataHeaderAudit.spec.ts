/**
 * 数据表头计数审计
 *
 * 各 data/*.ts 的头注释常写着「N 条 / N 件 / N 个」,给读代码的人一个规模印象。
 * 但内容一加,这些数字就悄悄过期 —— 刚清过的就有词条 118→110、法宝 20→26、
 * 装备 50→77、天赋 30→33。这类"看着像事实的注释"比没有注释更坏。
 *
 * 这里不重抄一张表,而是**读源码文本、取头注释里声明的数字,再与真实数组长度比对**:
 * 谁改了内容忘了改注释,这里立刻红。
 */
import { describe, expect, it } from 'vitest'
import { AFFIXES } from '@/data/affixes'
import { ARTIFACTS } from '@/data/artifacts'
import { EQUIPMENT_TEMPLATES } from '@/data/equipment'
import { TALENTS } from '@/data/talents'
import { ENEMIES } from '@/data/enemies'
import { BUILDINGS } from '@/data/buildings'
import { REGIONS } from '@/data/regions'
import { PILLS } from '@/data/pills'
import { ACHIEVEMENTS } from '@/data/achievements'
import { EVENTS } from '@/data/events'
import { CHAINS } from '@/data/chains'

const SOURCES = import.meta.glob('../data/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** 文件名(相对 data/)→ 该文件导出的数组,及其头注释里声明的规模 */
const TABLES: { file: string; label: string; length: number }[] = [
  { file: 'affixes.ts', label: '词条', length: AFFIXES.length },
  { file: 'artifacts.ts', label: '法宝', length: ARTIFACTS.length },
  { file: 'equipment.ts', label: '装备模板', length: EQUIPMENT_TEMPLATES.length },
  { file: 'talents.ts', label: '天赋', length: TALENTS.length },
  { file: 'enemies.ts', label: '敌人', length: ENEMIES.length },
  { file: 'buildings.ts', label: '建筑', length: BUILDINGS.length },
  { file: 'regions.ts', label: '区域', length: REGIONS.length },
  { file: 'pills.ts', label: '丹药', length: PILLS.length },
  { file: 'achievements.ts', label: '成就', length: ACHIEVEMENTS.length },
  { file: 'events.ts', label: '随机事件(含奇缘阶段)', length: EVENTS.length },
  { file: 'chains.ts', label: '奇缘', length: CHAINS.length }
]

describe('数据表头计数 · 与真实数组长度一致', () => {
  it('头注释里写的规模,就是数组的实际长度', () => {
    for (const t of TABLES) {
      const raw = SOURCES[`../data/${t.file}`]
      expect(raw, `找不到数据文件 ${t.file}`).toBeTruthy()
      // 头注释:文件前 4 行里第一个「N 条/件/个/座/处/味」
      const head = raw!.split('\n').slice(0, 4).join('\n')
      const m = /(\d+)\s*(条|件|个|座|处|味)/.exec(head)
      expect(m, `${t.file} 的头注释里没有可核对的规模数字(${t.label})`).not.toBeNull()
      expect(Number(m![1]), `${t.file} 头注释写「${m![1]}」,实际 ${t.length} ${t.label}`).toBe(t.length)
    }
  })
})
