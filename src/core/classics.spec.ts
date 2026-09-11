/**
 * 典籍志审计 —— 境界名的「来路」必须真的能在典籍表里查到
 *
 * 界域志把每一条来路摊开给玩家看,于是多了一条必须守住的线:
 * **境界 lore 里引到书名号《》的原典,典籍表里就得真有这一部,且它确实关联该境。**
 * 否则界域志就成了"看着很讲究、其实对不上"的装饰。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CLASSICS, PLANNED_SCHOOLS, classicDef, classicsForRealm } from '@/data/classics'
import { HEXAGRAMS, TRIGRAMS } from '@/data/yijing'
import { REALMS } from '@/data/realms'

const norm = (s: string): string => s.replace(/\s+/g, '')

/** 境界的出处类别 → 典籍的学派(两套命名,避免直接字符串比对导致误判) */
const BASIS_SCHOOL: Record<string, string> = {
  内丹: '丹道',
  佛道: '佛道',
  道教仙阶: '道教',
  网文: '网文',
  道家本源: '道家'
}

describe('典籍志 · 结构', () => {
  it('每一部典籍字段齐全,id 唯一', () => {
    expect(CLASSICS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(CLASSICS.map(c => c.id)).size).toBe(CLASSICS.length)
    for (const c of CLASSICS) {
      expect(c.title, `${c.id} 缺书名`).toBeTruthy()
      expect(c.source, `《${c.title}》缺作者/年代`).toBeTruthy()
      expect(c.gist.length, `《${c.title}》缺释义`).toBeGreaterThanOrEqual(12)
      expect(classicDef(c.id)?.title).toBe(c.title)
    }
  })

  it('典籍关联的境界 id 都真实存在', () => {
    const ids = new Set(REALMS.map(r => r.id))
    for (const c of CLASSICS) {
      for (const rid of c.realms) {
        expect(ids.has(rid), `《${c.title}》关联了不存在的境界 ${rid}`).toBe(true)
      }
    }
  })

  it('四大来路各有原典:丹道 / 道家 / 道教 / 网文', () => {
    const schools = new Set(CLASSICS.map(c => c.school))
    for (const s of ['丹道', '道家', '道教', '网文']) {
      expect(schools.has(s as never), `缺少「${s}」一脉的典籍`).toBe(true)
    }
  })
})

describe('典籍志 · 与境界 lore 双向对得上', () => {
  it('境界 lore 引到的每一部书,典籍表里都有,且确实关联该境', () => {
    for (const r of REALMS) {
      for (const m of r.lore.matchAll(/《([^》]+)》/g)) {
        const cited = norm(m[1]!)
        const hit = CLASSICS.find(c => norm(c.title) === cited)
        expect(hit, `${r.name} 的 lore 引了《${m[1]}》,典籍表里却没有这一部`).toBeDefined()
        expect(hit!.realms, `《${hit!.title}》未关联 ${r.name}(${r.id})`).toContain(r.id)
      }
    }
  })

  it('反向:典籍点名的境界,其 lore 或 basis 与之相符', () => {
    for (const c of CLASSICS) {
      for (const rid of c.realms) {
        const realm = REALMS.find(r => r.id === rid)!
        // 或直接引了书名,或至少属于该典籍对应的来路(网文一脉不引书名)
        const cites = norm(realm.lore).includes(norm(c.title))
        const sameSchool = c.school === '网文' || BASIS_SCHOOL[realm.basis] === c.school
        expect(cites || sameSchool, `《${c.title}》关联了 ${realm.name},但两者既不同源也无引用`).toBe(true)
      }
    }
  })

  it('按境界回查典籍(界域志据此展示)', () => {
    expect(classicsForRealm('yuanying').map(c => c.title)).toContain('性命圭旨')
    expect(classicsForRealm('hundundaozu').map(c => c.title)).toContain('道德经')
    expect(classicsForRealm('nope')).toEqual([])
  })
})

describe('典籍志 · 未实装门类如实标注', () => {
  it('待续清单非空,且每条都注明未实装', () => {
    // 清单会随实装变短 —— 故只要求"还剩什么就如实标什么",不设下限
    expect(PLANNED_SCHOOLS.length).toBeGreaterThanOrEqual(1)
    for (const p of PLANNED_SCHOOLS) {
      expect(p.name).toBeTruthy()
      expect(p.note, `${p.name} 未注明状态`).toContain('未实装')
    }
  })

  it('实装了就得从待续里出来:周易、紫微与星象已在,不再挂着「未实装」', () => {
    expect(PLANNED_SCHOOLS.some(p => p.name.includes('周易'))).toBe(false)
    expect(PLANNED_SCHOOLS.some(p => p.name.includes('紫微'))).toBe(false)
    expect(PLANNED_SCHOOLS.some(p => p.name.includes('星象'))).toBe(false)
    expect(TRIGRAMS.length).toBe(8)
    expect(HEXAGRAMS.length).toBe(64)
  })

  it('界域志真的把周易摊开了:八卦、六十四卦与问卦都在页面上', () => {
    const src = readFileSync(resolve(__dirname, '../views/RealmCodexView.vue'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    // 只认"用过"的形态(调用/列表渲染),不认 import 那一行 —— 否则注释与导入都能冒充接线
    for (const token of ['in TRIGRAMS', 'in HEXAGRAMS', 'askDivination(', 'DIVINATION_COST']) {
      expect(src, `界域志没有接上 ${token}`).toContain(token)
    }
  })
})
