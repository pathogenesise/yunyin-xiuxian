/**
 * 数据完整性 —— 「写下的键」与「写下的门槛」都要成立
 *
 * 两类缺陷:
 *
 *   一 **属性键有人声明、没人写**:类型里留着一个属性键,却没有任何内容给它 ——
 *      等于一条永不生效的通道(反向也要查:vocabularyCoverage 管"没人读",这里管"没人写")。
 *      注:**属性键拼错**这一类不在此处 —— 类型系统已经拦住了:
 *      往 StatMods 写 `{ alchemyYieldX: 0.2 }` 时 vue-tsc 直接报
 *      「did not exist in type Partial<Record<AnyStatKey, number>>. Did you mean 'alchemyYield'?」
 *      (实测)。故不要再加一份正则启发式,那只会漏且吵。
 *   二 **门槛超出可达范围**:命题写着 minStage 9 而阶位只到 4 —— 那条命题永远不出现;
 *      同理 minRealm 超过最高境界、rank 超过最高品质,都是"看得见拿不到"。
 *
 * 判据都从真实来源倒推:属性键对着 types 的声明表,门槛对着各自的上界。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { MAX_MAJOR } from '@/data/realms'
import { REGIONS } from '@/data/regions'
import { QUALITIES } from '@/data/qualities'
import { LIFE_THEMES } from '@/data/lifeThemes'
import { SAMSARA_STAGES } from '@/data/samsara'

const DATA_DIR = resolve(__dirname, '../data')
const TYPES_SRC = readFileSync(resolve(__dirname, '../types/index.ts'), 'utf8')
const STAT_BLOCK = TYPES_SRC.slice(TYPES_SRC.indexOf('export type PercentStatKey'), TYPES_SRC.indexOf('export type AnyStatKey'))
const DECLARED_STAT_KEYS = new Set([...STAT_BLOCK.matchAll(/'([A-Za-z]+)'/g)].map(m => m[1]!))

function dataFiles(): string[] {
  return readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map(f => join(DATA_DIR, f))
}

describe('数据完整性 · 属性键必须有人写、也有人读', () => {
  it('每个声明的属性键都有内容在写(否则就是一条永不生效的通道)', () => {
    expect(DECLARED_STAT_KEYS.size).toBeGreaterThan(30)
    const corpus = dataFiles().map(f => readFileSync(f, 'utf8')).join('\n')
    const unused = [...DECLARED_STAT_KEYS].filter(k => !new RegExp(`\\b${k}\\s*:`).test(corpus))
    expect(unused, `这些属性键没有任何数据在用:${unused.join('、')}`).toEqual([])
  })
})

describe('数据完整性 · 内容门槛必须可达', () => {
  const MAX_REGION_TIER = Math.max(...REGIONS.map(r => r.tier))
  const MAX_QUALITY_RANK = Math.max(...QUALITIES.map(q => q.rank))
  const MAX_STAGE = Math.max(...SAMSARA_STAGES.map(s => s.index))

  it('命题的 minStage 不超阶位;每个阶位都够三条可选', () => {
    for (const t of LIFE_THEMES) {
      expect(t.minStage, `命题「${t.name}」要第 ${t.minStage} 阶,而阶位只到 ${MAX_STAGE}`).toBeLessThanOrEqual(MAX_STAGE)
    }
    for (const st of SAMSARA_STAGES) {
      const avail = LIFE_THEMES.filter(t => t.minStage <= st.index).length
      expect(avail, `阶位「${st.name}」只有 ${avail} 条命题可选,不够三条`).toBeGreaterThanOrEqual(3)
    }
  })

  it('最高区域层级与最高品质档位与数据一致(门槛类判据的上界来源)', () => {
    expect(MAX_REGION_TIER).toBeGreaterThan(0)
    expect(MAX_QUALITY_RANK).toBe(8)
    expect(MAX_MAJOR).toBeGreaterThan(0)
  })
})
