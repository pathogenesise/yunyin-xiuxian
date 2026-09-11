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
import { readFileSync } from 'node:fs'
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
