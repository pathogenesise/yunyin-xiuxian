/**
 * 图鉴的来源说明,必须与真实的「收录点」对得上
 *
 * 未收录的条目在界面上只是一片「???」:玩家看得出还差多少,却不知道去哪儿找。
 * 故每册加了一句来源说明(「来源:历练掉落 —— 强敌与首领更易出」)。
 *
 * 但这种说明最容易变成谎话:玩法一改(比如参悟改从别的路来、掉落挪了地方),
 * 谁也想不起去改那句小字。所以判据不从文案自身出发,而是**扫源码里的 collect()
 * 调用点** —— 哪一类是在哪个模块被收录的,那个模块就得能对上说明里的路子:
 *
 *   loot.ts        → 说明里得提「掉落」
 *   gongfaService  → 「参悟」
 *   pillService    → 「炼」
 *   eventEngine    → 「际遇」(灵兽是「结缘」)
 *   reincarnation  → 「转世」
 *
 * 故障注入:把某册的说明改成不相干的字样(如把「历练掉落」改成「宗门赐下」),
 * 或把 collect('talent') 挪到别的模块,本文件立刻红。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CODEX_SOURCES } from '@/ui/codex'
import type { CollectionCategory } from '@/stores/quests'

const SRC = resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith('.spec.ts')) out.push(full)
  }
  return out
}

/** 每一类是在哪些模块里被 collect 的(相对 src/ 的路径) */
function collectorsOf(cat: CollectionCategory): string[] {
  const hits: string[] = []
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8')
    if (new RegExp(`collect\\(\\s*'${cat}'`).test(src)) hits.push(file.slice(SRC.length + 1))
  }
  return hits.sort()
}

/** 模块 → 说明里必须出现的字样 */
const MODULE_KEYWORD: Record<string, string> = {
  'core/loot.ts': '掉落',
  'core/gongfaService.ts': '参悟',
  'core/pillService.ts': '炼',
  'core/eventEngine.ts': '际遇',
  'core/reincarnation.ts': '转世'
}

describe('图鉴 · 来源说明与收录点同源', () => {
  const CATS = Object.keys(CODEX_SOURCES) as CollectionCategory[]

  it('每一类都有来源说明,且不是空话', () => {
    for (const cat of CATS) {
      expect(CODEX_SOURCES[cat], `${cat} 没有来源说明 —— 那一册的「???」就成了死胡同`).toMatch(/^来源:/)
    }
  })

  it('说明里提的路子,就是 collect 真正发生的地方', () => {
    const problems: string[] = []
    for (const cat of CATS) {
      const collectors = collectorsOf(cat)
      if (collectors.length === 0) {
        problems.push(`${cat}: 找不到任何 collect 调用点 —— 这一类没有获取路径?`)
        continue
      }
      const known = collectors.filter(f => f in MODULE_KEYWORD)
      if (known.length === 0) {
        problems.push(`${cat}: 收录点 ${collectors.join('、')} 都不在已知机制表里,说明无从校准`)
        continue
      }
      const text = CODEX_SOURCES[cat]
      for (const file of known) {
        const keyword = MODULE_KEYWORD[file]!
        if (!text.includes(keyword)) {
          problems.push(`${cat}: 收录发生在 ${file},而说明里没提「${keyword}」——现在写的是「${text}」`)
        }
      }
    }
    expect(problems, problems.join('\n')).toEqual([])
  })

  it('反向也成立:说明里提到的机制,得有对应的收录点', () => {
    // 「来源:炼丹」这类话不能凭空写 —— 提到「炼」就得真有 pillService 在 collect
    for (const cat of CATS) {
      const text = CODEX_SOURCES[cat]
      if (!text.includes('炼')) continue
      expect(
        collectorsOf(cat).includes('core/pillService.ts'),
        `${cat} 的说明说能炼出来,但没有任何炼丹收录点`
      ).toBe(true)
    }
  })
})
