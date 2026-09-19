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

  it('luck 主要抬装备成色,小进阶只折入此数的 5%', () => {
    expect(modsText({ luck: 0.1 })).toBe('气运 +10%(主要抬装备成色;小进阶另吃此数的 5%)')
    const gen = readFileSync(resolve(__dirname, '../core/equipGen.ts'), 'utf8')
    expect(gen).toContain('luckBoost')
    const bt = readFileSync(resolve(__dirname, '../core/breakthrough.ts'), 'utf8')
    expect(bt).toContain("modOf(mods, 'luck') * 0.05")
    const explore = readFileSync(resolve(__dirname, '../core/exploration.ts'), 'utf8')
    expect(explore).not.toContain("modOf(mods, 'luck')")
  })

  it('进阶成功率词条自带小进阶边界,称号丹药天时共用', () => {
    expect(modsText({ breakthroughRate: 0.08 })).toBe('进阶成功率 +8%(小进阶;大关天劫不吃)')
  })

  it('explorationSpeed 只加密同程遭遇,不说成缩短行程', () => {
    expect(modsText({ explorationSpeed: 0.3 })).toBe('历练遇敌 +30%(同程更多遭遇;不缩短行程)')
    expect(modsText({ explorationSpeed: 0.3 })).not.toContain('历练速度')
    const explore = readFileSync(resolve(__dirname, '../core/exploration.ts'), 'utf8')
    expect(explore).toContain("modOf(player.finalStats.mods, 'explorationSpeed')")
    expect(explore).toContain('modeDef.durationSec * petEff.exploreDurMult')
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
    expect(modsText({ dropRate: 0.08 })).toBe('装备掉落率 +8%(只抬装备出现;灵石草矿不吃)')
    expect(modsText({ dropRate: 0.08 })).not.toBe('掉落率 +8%')
    const loot = readFileSync(resolve(__dirname, '../core/loot.ts'), 'utf8')
    expect(loot).toContain("modOf(mods, 'dropRate')")
    expect(loot).toContain('equipChance')
    expect(loot).not.toMatch(/stoneAmt[\s\S]{0,80}dropRate/)
  })

  it('spiritStoneGain 只报历练战胜灵石,不说成一切入账都涨', () => {
    expect(modsText({ spiritStoneGain: 0.12 })).toBe('战利灵石 +12%(历练战胜所得;洞府产出不吃)')
    expect(modsText({ spiritStoneGain: 0.12 })).not.toContain('灵石获取')
    const loot = readFileSync(resolve(__dirname, '../core/loot.ts'), 'utf8')
    expect(loot).toContain("modOf(mods, 'spiritStoneGain')")
    const suppress = readFileSync(resolve(__dirname, '../core/suppress.ts'), 'utf8')
    expect(suppress).not.toContain('spiritStoneGain')
  })

  it('forgeDiscount 只报装备强化花费,不说成整张炼器台都打折', () => {
    expect(modsText({ forgeDiscount: 0.1 })).toBe('强化减耗 +10%(装备强化花费;法宝祭炼不吃)')
    expect(modsText({ forgeDiscount: 0.1 })).not.toContain('炼器减耗')
    const forge = readFileSync(resolve(__dirname, '../core/forge.ts'), 'utf8')
    expect(forge).toContain("modOf(player.finalStats.mods, 'forgeDiscount')")
    expect(forge).toContain('upgradeCost')
    expect(forge).not.toMatch(/artifact[\s\S]{0,120}forgeDiscount/)
  })

  it('eventLuck 只报历练途中掷点,不说成一切际遇都涨', () => {
    expect(modsText({ eventLuck: 0.15 })).toBe('历练际遇 +15%(只抬历练途中掷点;洞府巡游不吃)')
    expect(modsText({ eventLuck: 0.15 })).not.toContain('际遇概率')
    const explore = readFileSync(resolve(__dirname, '../core/exploration.ts'), 'utf8')
    expect(explore).toContain("modOf(mods, 'eventLuck')")
    expect(explore).toContain('EXPLORE_EVENT_CHANCE')
    const cave = readFileSync(resolve(__dirname, '../core/earlyGameService.ts'), 'utf8')
    expect(cave).not.toContain('eventLuck')
  })

  it('doubleDropRate 报当场整包翻倍,不说成只多一件装备', () => {
    expect(modsText({ doubleDropRate: 0.1 })).toBe('双倍战利 +10%(当场灵石修为材料装备一并翻)')
    const loot = readFileSync(resolve(__dirname, '../core/loot.ts'), 'utf8')
    expect(loot).toContain("modOf(mods, 'doubleDropRate')")
    expect(loot).toContain('doubled')
    expect(loot).toContain('stoneAmt')
  })

  it('expGain 只报历练战胜修为,不说成静修也涨', () => {
    expect(modsText({ expGain: 0.3 })).toBe('战斗修为 +30%(历练战胜所得;静修挂机不吃)')
    const loot = readFileSync(resolve(__dirname, '../core/loot.ts'), 'utf8')
    expect(loot).toContain("modOf(mods, 'expGain')")
    const formulas = readFileSync(resolve(__dirname, '../core/formulas.ts'), 'utf8')
    expect(formulas).not.toContain('expGain')
  })

  it('先手判定是阈值开关,不是出手变快', () => {
    expect(modsText({ speed: 0.06 })).toBe('先手判定 +6%(1+此项≥对手速度才抢先)')
    const combat = readFileSync(resolve(__dirname, '../core/combat.ts'), 'utf8')
    expect(combat).toContain('1 + modOf(pEff.mods, \'speed\')')
    expect(combat).toContain('pSpeed >= eSpeed')
  })

  it('首回合伤害只乘第一回合,不改先手判定', () => {
    expect(modsText({ firstStrike: 0.2 })).toBe('首回合伤害 +20%(只乘第一回合;不改谁先出手)')
    const combat = readFileSync(resolve(__dirname, '../core/combat.ts'), 'utf8')
    expect(combat).toContain("modOf(aMods, 'firstStrike')")
    expect(combat).toContain('round === 1')
  })

  it('御劫只改天劫承伤,不改小进阶骰子', () => {
    expect(modsText({ tribulationResist: 0.2 })).toBe('御劫 +20%(天劫承伤;不改小进阶骰子)')
    const trib = readFileSync(resolve(__dirname, '../core/tribulationDecision.ts'), 'utf8')
    expect(trib).toContain("modOf(mods, 'tribulationResist')")
    const bt = readFileSync(resolve(__dirname, '../core/breakthrough.ts'), 'utf8')
    expect(bt).toContain("modOf(mods, 'breakthroughRate')")
    expect(bt).not.toContain("modOf(mods, 'tribulationResist')")
  })

  it('功法、装备详情和法宝被动都走同源词条句,不再手写加号', () => {
    const gongfa = readFileSync(resolve(__dirname, '../components/cultivation/GongfaDialog.vue'), 'utf8')
    const equip = readFileSync(resolve(__dirname, '../components/equipment/EquipmentDetailDialog.vue'), 'utf8')
    const bag = readFileSync(resolve(__dirname, '../views/InventoryView.vue'), 'utf8')
    expect(gongfa).toContain('statValueText(k, v as number)')
    expect(gongfa).not.toContain('+${formatPercent')
    expect(equip).toContain('statValueText(k, v as number)')
    expect(bag).toContain('statModPhrase(k, v as number)')
    const vein = readFileSync(resolve(__dirname, '../components/dongfu/VeinInvestCard.vue'), 'utf8')
    expect(vein).toContain('modsText(dongfu.veinMods)')
    const buff = readFileSync(resolve(__dirname, '../components/cultivation/BuffDialog.vue'), 'utf8')
    expect(buff).toContain('statValueText(key, v)')
    expect(buff).toContain('STAT_NAMES')
  })
})
