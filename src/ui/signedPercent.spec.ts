import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { signedPercent, modsText } from './statNames'

describe('signedPercent', () => {
  it('负值是减号,不会拼出 +-', () => {
    expect(signedPercent(-0.5)).toBe('-50%')
    expect(signedPercent(0.12)).toBe('+12%')
    expect(signedPercent(-0.5)).not.toContain('+-')
  })

  it('进阶成功率词条自带小进阶边界,称号丹药天时共用', () => {
    expect(modsText({ breakthroughRate: 0.08 })).toBe('进阶成功率 +8%(小进阶;大关天劫不吃)')
  })

  it('alchemyYield 只报双枚成丹概率,不说成产量翻倍', () => {
    expect(modsText({ alchemyYield: 0.1 })).toBe('双枚成丹 +10%(多一枚的概率;与手艺合计顶 80%)')
    expect(modsText({ alchemyYield: 0.1 })).not.toContain('炼丹产出')
    const craft = readFileSync(resolve(__dirname, '../core/pillService.ts'), 'utf8')
    expect(craft).toContain("modOf(player.finalStats.mods, 'alchemyYield')")
    expect(craft).toContain('bonusChance + yieldMod')
    expect(craft).toContain('Math.min(0.8')
  })

  it('breakRefund 只报失败少损修为,不说成突破返还', () => {
    expect(modsText({ breakRefund: 0.1 })).toBe('失败返还修为 +10%(失败掉的那份;不退灵气)')
    expect(modsText({ breakRefund: 0.1 })).not.toContain('突破返还')
    const bt = readFileSync(resolve(__dirname, '../core/breakthrough.ts'), 'utf8')
    expect(bt).toContain("modOf(mods, 'breakRefund')")
    expect(bt).toContain('loseExpPct')
    expect(bt.indexOf('setQi')).toBeLessThan(bt.indexOf("modOf(mods, 'breakRefund')"))
  })

  it('dropRate 只报装备出现率,不说成一切战利都涨', () => {
    expect(modsText({ dropRate: 0.08 })).toBe('装备掉落率 +8%')
    expect(modsText({ dropRate: 0.08 })).not.toBe('掉落率 +8%')
    const loot = readFileSync(resolve(__dirname, '../core/loot.ts'), 'utf8')
    expect(loot).toContain("modOf(mods, 'dropRate')")
    expect(loot).toContain('equipChance')
    expect(loot).not.toMatch(/stoneAmt[\s\S]{0,80}dropRate/)
  })

  it('功法、装备详情和法宝被动都走 signedPercent,不再手写加号', () => {
    const gongfa = readFileSync(resolve(__dirname, '../components/cultivation/GongfaDialog.vue'), 'utf8')
    const equip = readFileSync(resolve(__dirname, '../components/equipment/EquipmentDetailDialog.vue'), 'utf8')
    const bag = readFileSync(resolve(__dirname, '../views/InventoryView.vue'), 'utf8')
    expect(gongfa).toContain('signedPercent(v as number)')
    expect(gongfa).not.toContain('+${formatPercent')
    expect(equip).toContain('signedPercent(v as number)')
    expect(bag).toContain('signedPercent(v as number)')
    const buff = readFileSync(resolve(__dirname, '../components/cultivation/BuffDialog.vue'), 'utf8')
    expect(buff).toContain('breakthroughRate')
    expect(buff).toContain('大关天劫不吃')
  })
})
