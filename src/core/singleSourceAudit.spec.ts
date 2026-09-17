/**
 * 同源审计 —— 同一件事只许有一处算法(读源码文本)
 *
 * 本仓库反复踩的坑(见 HYP-015):同一件事写两遍,改一处必漏一处 ——
 * 界面手抄一份结算常数、在线离线各写一个门槛、会话另算一份收益。
 *
 * 这类缺陷**行为测试看不见**:界面自己又算一遍时,数值照样"对",直到有人调了那半边。
 * 故这里直接读源码文本,把「谁都不许再抄一遍」写成断言。
 */
import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(
  [
    '../views/AdventureView.vue',
    '../components/adventure/CombatPanel.vue',
    '../core/exploration.ts',
    '../core/offline.ts'
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>

/**
 * 取某文件源码。按**文件名**取,不按路径 ——
 * glob 的键是相对本文件的路径('../views/…' 与 './exploration.ts' 两种形状混在一起),
 * 按路径匹配会漏掉同目录的那两个,漏了就会在空字符串上假绿。
 */
function readSrc(fileName: string): string {
  const hit = Object.entries(SOURCES).find(([path]) => path.split('/').pop() === fileName)
  if (!hit) throw new Error(`审计读不到 ${fileName} —— glob 没匹配上,断言会假绿`)
  return hit[1]
}

describe('同源审计 · 镇压速率', () => {
  it('历练页的镇压速率走 suppressRateFor,自己不许再算一遍 stoneByTier', () => {
    const src = readSrc('AdventureView.vue')
    expect(src, '界面必须用唯一那份速率实现').toContain('suppressRateFor')
    // 判「有没有再算一遍」而不是「有没有提到这个词」:注释里解释这件事本身是好事
    expect(src, '界面自己算一遍就等于第二份真相源(调常数时界面开始撒谎)').not.toMatch(/stoneByTier\s*\(/)
  })
})

describe('同源审计 · 区域之主的门槛', () => {
  it('在线与离线都不许再写死 10 胜,只认 EXPLORE_BOSS_AFTER_WINS', () => {
    for (const fileName of ['exploration.ts', 'offline.ts']) {
      const src = readSrc(fileName)
      expect(src, `${fileName} 该引用具名常数`).toContain('EXPLORE_BOSS_AFTER_WINS')
      expect(src, `${fileName} 里又出现了 wins >= 10 这种字面量`).not.toMatch(/wins\s*>=\s*10\b/)
    }
  })

  it('战斗页的头目提示走 winsUntilRegionBoss,不自己比门槛', () => {
    const src = readSrc('CombatPanel.vue')
    expect(src).toContain('winsUntilRegionBoss')
    expect(src, '提示自己比一遍门槛,改常数时提示就开始撒谎').not.toContain('EXPLORE_BOSS_AFTER_WINS')
  })
})

describe('同源审计 · 历练收益账', () => {
  it('会话收益取 afterWin 真实入账,不自己按层级另算,也不数文案行', () => {
    const src = readSrc('exploration.ts')
    expect(src, '会话该记 afterWin 报的 drops.stone / drops.exp / drops.items').toMatch(/drops\.(stone|exp|items)/)
    expect(src, '自己按层级算一份灵石 = 与行囊对不上的第二套账').not.toMatch(/stoneByTier\s*\(/)
    expect(src, 'items 属实物件数,不许拿文案行数充数').not.toMatch(/drops\.lines\.length/)
  })

  it('离线把挂机所得折进会话(回来接着打时面板不漏离线段)', () => {
    const src = readSrc('offline.ts')
    expect(src).toMatch(/stoneGain:\s*add\(session\.stoneGain/)
    expect(src).toMatch(/expGain:\s*add\(session\.expGain/)
  })
})
