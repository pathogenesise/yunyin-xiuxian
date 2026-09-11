/**
 * 文案数值对账 —— 「写了多少,就得给多少」
 *
 * 玩家最容易撞见的缺陷不是崩溃,而是**说明与实现不一致**:文案写「攻击 +20%」,
 * 数据里却是 0.15;或者规则改过一版,文案忘了跟。这类问题单元测试看不见
 * (两边各自都"对"),静态审计也看不见(类型不关心数字),只有把两者对起来才现形。
 *
 * 判据只钉**形状保证配对**的那几张表:条目自带说明文本、也自带数值负载
 * (变数、秘境随机规则、增益)。其余地方文案里的数字可能来自别的表
 * (例如顿悟选项的数值挂在 buffs 上),硬对只会误报,故不在此列。
 *
 * 编码有三种,都要认:
 *   x      —— 0.15 表示 +15%(概率、词条)
 *   1+x    —— 1.15 表示 +15%(敌方/治疗倍率)
 *   1-x    —— 0.25 与「-75%」同义(治疗压制)
 * 另有「降低/减少/下降」这类反向措辞,允许数值为负。
 */
import { describe, expect, it } from 'vitest'
import { MUTATORS } from '@/data/mutators'
import { SECRET_RULES } from '@/data/secretRealms'
import { BUFFS } from '@/data/buffs'
import { PACTS } from '@/data/pacts'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/** 文案里的百分比是否能在同一条目的数值里找到对应 */
function percentBacked(percent: number, nums: number[]): boolean {
  const p = percent / 100
  return nums.some(v => {
    const candidates = [v, Math.abs(v)]
    for (const c of candidates) {
      if (Math.abs(c - p) < 1e-9) return true // x
      if (Math.abs(c - 1 - p) < 1e-9) return true // 1+x
      if (Math.abs(c - (1 - p)) < 1e-9) return true // 1-x
      if (Math.abs(c - percent) < 1e-9) return true // 直接写了百分数
    }
    return false
  })
}

function percentsOf(text: string): number[] {
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => Number(m[1]!))
}

describe('文案数值对账 · 天道变数', () => {
  it('每条变数说明里的百分比,都能在它自己的 rules 里找到', () => {
    let checked = 0
    for (const m of MUTATORS) {
      const nums = Object.values(m.rules).flatMap(v =>
        typeof v === 'number' ? [v] : typeof v === 'object' && v !== null ? Object.values(v) : []
      ) as number[]
      for (const pc of percentsOf(m.text)) {
        checked += 1
        expect(percentBacked(pc, nums), `变数「${m.name}」文案写 ${pc}%,数值里对不上:${m.text} · [${nums.join(', ')}]`).toBe(true)
      }
    }
    expect(checked, '一条百分比都没扫到,断言形同虚设').toBeGreaterThanOrEqual(5)
  })
})

describe('文案数值对账 · 秘境随机规则', () => {
  it('每条规则的说明与它自己的 rules 一致', () => {
    let checked = 0
    for (const r of SECRET_RULES) {
      const nums = Object.values(r.rules).flatMap(v =>
        typeof v === 'number' ? [v] : typeof v === 'object' && v !== null ? Object.values(v) : []
      ) as number[]
      for (const pc of percentsOf(r.text)) {
        checked += 1
        expect(percentBacked(pc, nums), `秘境规则「${r.text}」的 ${pc}% 对不上:[${nums.join(', ')}]`).toBe(true)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3)
  })
})

describe('文案数值对账 · 增益(Buff)', () => {
  it('每味增益的说明百分比,都能在它自己的 mods 里找到', () => {
    let checked = 0
    for (const b of BUFFS) {
      const nums = Object.values(b.mods) as number[]
      for (const pc of percentsOf(b.desc)) {
        checked += 1
        expect(percentBacked(pc, nums), `增益「${b.name}」说明写 ${pc}%,mods 里对不上:${b.desc} · [${nums.join(', ')}]`).toBe(true)
      }
    }
    expect(checked, '增益说明里扫到的百分比太少,判据覆盖不足').toBeGreaterThanOrEqual(8)
  })
})

describe('文案数值对账 · 天道契约', () => {
  /**
   * 契约的规则文案里有两类数字:
   *   ① 数值型 —— maxRounds / playerStartHpPct 等,写在 rules 里;
   *   ② 特殊约束 —— 如 `special: 'endHp80'`(每场战后气血须 ≥80%),
   *      数值就藏在特殊标记的名字里,故额外允许"百分比数字出现在 special 字符串里"。
   */
  it('每条契约的规则文案,数字都能在它自己的 rules / sourceMult / special 里找到', () => {
    let checked = 0
    for (const p of PACTS) {
      const rules = p.rules ?? {}
      const nums = Object.values(rules).flatMap(v =>
        typeof v === 'number' ? [v] : typeof v === 'object' && v !== null ? Object.values(v) : []
      ) as number[]
      if (typeof p.sourceMult === 'number') nums.push(p.sourceMult)
      for (const pc of percentsOf(p.ruleText)) {
        checked += 1
        const inSpecial = typeof p.special === 'string' && p.special.includes(String(pc))
        expect(
          inSpecial || percentBacked(pc, nums),
          `契约「${p.name}」文案写 ${pc}%,rules/特殊约束里对不上:${p.ruleText}`
        ).toBe(true)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(1)
  })

  it('契约文案里的**裸数字**也要对得上(「回合上限 25」这类不带宽高符号的写法)', () => {
    // 只扫 % 会漏掉契约最典型的写法:「回合上限 25」「道源 ×1.6」。
    // 契约文案是公式化的,故这里连裸数字一起对账(变数/增益的文案更散文,不适用)。
    let checked = 0
    for (const p of PACTS) {
      const rules = p.rules ?? {}
      const nums = Object.values(rules).flatMap(v =>
        typeof v === 'number' ? [v] : typeof v === 'object' && v !== null ? Object.values(v) : []
      ) as number[]
      if (typeof p.sourceMult === 'number') nums.push(p.sourceMult)
      for (const m of p.ruleText.matchAll(/(\d+(?:\.\d+)?)/g)) {
        const n = Number(m[1])
        checked += 1
        const inSpecial = typeof p.special === 'string' && p.special.includes(String(n))
        expect(inSpecial || percentBacked(n, nums), `契约「${p.name}」文案里的 ${n} 对不上:${p.ruleText}`).toBe(true)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(4)
  })
})

/**
 * 视图文案也要对账 —— 这一类更难自动核:模板里的数字可能是常量、也可能来自别的表。
 * 故只钉**已经确认过归属**的几处:它们曾经手抄过数字(注释还写着"唯一来源是 X",
 * 数字却是手打的),改常数就会撒谎。判据 = 引用来源 + 不再出现那个字面量。
 */
describe('文案数值对账 · 视图不手抄数字', () => {
  const src = (from: string): string =>
    readFileSync(resolve(__dirname, from), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

  it('人物页的道果说明与边际收益都取自 DAO_FRUIT_* 常数', () => {
    const view = src('../views/CharacterView.vue')
    expect(view, '道果每枚加成应读常数').toContain('DAO_FRUIT_CULT_BONUS')
    expect(view, '道躯加成应读常数').toContain('DAO_FRUIT_COMBAT_BONUS')
    // 手抄过的两处字面量必须消失(改了常数却忘了改文案,正是这条要拦的)
    expect(view).not.toContain('修行 +3%')
    expect(view).not.toContain('道躯 +1.5%')
    expect(view, '边际收益里的 ×3 也是手抄的,应改成常数').not.toMatch(/effective \* 3\b/)
  })

  it('修行页的闭关文案取自 buffs.ts 的 retreat 本体', () => {
    const view = src('../views/CultivationView.vue')
    expect(view, '闭关时长与加成应读 buff 定义').toContain("buffDef('retreat')")
    expect(view).not.toContain('5 分钟,修炼速度 +150%')
    expect(view).not.toContain('5分钟 修炼 +150%')
  })
})

/**
 * 术语一致性 —— 同一个东西只能有一个名字
 *
 * 起因:同一个"历练中偶遇的随机事件"在项目里有四个近义叫法——奇遇(词条名/成就文案)、
 * 际遇(成就名)、机缘(ft_ 取弃事件)、奇缘(我后来接的连锁)。它们各自是**不同机制**,
 * 但四个近义词并排出现时,玩家会把它们当成一件事(「奇遇概率」涨的是哪一类?)。
 *
 * 约定(写进判据,不再靠记性):
 *   际遇 = 历练中偶遇的随机事件(eventLuck 词条、经历计数)
 *   机缘 = 稀有的取/弃事件(ft_,界域志的机缘取弃)
 *   奇缘 = 阶段性连锁(奇缘录)
 * 另:vein 系统一律叫"灵脉"(不再混用"地脉")。
 */
describe('术语一致性 · 用户可见文本', () => {
  /** 数据里的字符串字面量 + 视图模板(即玩家真正读得到的那部分) */
  const userText = (): { file: string; text: string }[] => {
    const out: { file: string; text: string }[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(resolve(__dirname, dir))) {
        const rel = `${dir}/${entry}`
        if (entry.endsWith('.spec.ts')) continue
        const stat = statSync(resolve(__dirname, rel))
        if (stat.isDirectory()) {
          walk(rel)
          continue
        }
        const src = readFileSync(resolve(__dirname, rel), 'utf8')
        if (entry.endsWith('.vue')) {
          // 只取模板(去掉注释)
          out.push({ file: rel, text: src.split('</script>')[0]!.replace(/<!--[\s\S]*?-->/g, '') })
        } else if (entry.endsWith('.ts')) {
          const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
          out.push({ file: rel, text: [...body.matchAll(/'([^'\\\n]{2,})'/g)].map(m => m[1]!).join('\n') })
        }
      }
    }
    walk('../data')
    walk('../views')
    walk('../components')
    walk('../ui') // 词条名表就在这儿(属性面板上的标签)
    walk('../core') // toast 与区域事件文案也算玩家可见
    return out
  }

  /** 允许保留的例外:这里的地脉说的是村子的风水脉,不是洞府灵脉系统 */
  const ALLOWED = ['须惊动山下一整座村子的地脉']

  it('随机事件一律叫「际遇」:用户可见文本里不再出现「奇遇」', () => {
    const hits: string[] = []
    for (const { file, text } of userText()) {
      for (const m of text.matchAll(/.{0,16}奇遇.{0,16}/g)) {
        if (ALLOWED.some(a => m[0].includes(a))) continue
        hits.push(`${file} 「${m[0]}」`)
      }
    }
    expect(hits, `「奇遇」应统一为「际遇」(奇缘=连锁、机缘=取弃事件,各留一名):\n${hits.join('\n')}`).toEqual([])
  })

  it('洞府灵脉一律叫「灵脉」:用户可见文本里不再出现用作系统名的「地脉」', () => {
    const hits: string[] = []
    for (const { file, text } of userText()) {
      for (const m of text.matchAll(/.{0,16}地脉.{0,16}/g)) {
        if (ALLOWED.some(a => m[0].includes(a))) continue
        hits.push(`${file} 「${m[0]}」`)
      }
    }
    expect(hits, `「地脉」应统一为「灵脉」:\n${hits.join('\n')}`).toEqual([])
  })

  it('历练一律叫「历练」:用户可见文本里不再用「探索」指代这件活动', () => {
    const hits: string[] = []
    for (const { file, text } of userText()) {
      for (const m of text.matchAll(/.{0,16}探索.{0,16}/g)) hits.push(`${file} 「${m[0]}」`)
    }
    expect(hits, `「探索」应统一为「历练」:\n${hits.join('\n')}`).toEqual([])
  })

  it('三个词各指一件事:机缘/际遇/奇缘在用户可见文本里都真的在用', () => {
    const all = userText().map(u => u.text).join('\n')
    for (const term of ['机缘', '际遇', '奇缘']) {
      expect(all, `${term} 一个例子都没有 —— 术语约定与内容脱节了`).toContain(term)
    }
  })
})
