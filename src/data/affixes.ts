/** 随机词条池 —— 118 条,通过权重与品质门槛控制稀有度 */
import type { AffixDef, AnyStatKey, EquipSlot, AffixRarity } from '@/types'

const W = ['weapon'] as EquipSlot[]
const A = ['head', 'body', 'wrist', 'belt', 'boots'] as EquipSlot[]
const J = ['necklace', 'ring', 'talisman'] as EquipSlot[]
const WJ = [...W, ...J]
const AJ = [...A, ...J]

function a(
  id: string,
  name: string,
  key: AnyStatKey,
  min: number,
  max: number,
  desc: string,
  weight = 100,
  opts: { slots?: EquipSlot[]; minRank?: number; decimals?: number; rarity?: AffixRarity } = {}
): AffixDef {
  // 自动推断 rarity:权重≥90=common, ≥50=rare, ≥20=epic, <20=legendary
  const rarity = opts.rarity ?? (weight >= 90 ? 'common' : weight >= 50 ? 'rare' : weight >= 20 ? 'epic' : 'legendary')
  return { id, name, desc, key, min, max, decimals: opts.decimals ?? 1, weight, rarity, slots: opts.slots, minRank: opts.minRank }
}

export const AFFIXES: AffixDef[] = [
  // ---- 攻击 ----
  a('atk1', '锋锐', 'attackPct', 2, 5, '攻击提升 {v}%'),
  a('atk2', '破军', 'attackPct', 5, 10, '攻击提升 {v}%', 60, { minRank: 2 }),
  a('atk3', '灭世', 'attackPct', 10, 18, '攻击提升 {v}%', 25, { minRank: 5 }),
  a('atk4', '开天', 'attackPct', 18, 30, '攻击提升 {v}%', 8, { minRank: 7 }),
  // ---- 防御 ----
  a('def1', '坚壁', 'defensePct', 3, 6, '防御提升 {v}%'),
  a('def2', '磐石', 'defensePct', 6, 12, '防御提升 {v}%', 60, { minRank: 2 }),
  a('def3', '不朽', 'defensePct', 12, 20, '防御提升 {v}%', 25, { minRank: 5 }),
  a('def4', '亘古', 'defensePct', 20, 32, '防御提升 {v}%', 8, { minRank: 7 }),
  // ---- 生命 ----
  a('hp1', '蕴生', 'maxHpPct', 3, 6, '生命上限提升 {v}%'),
  a('hp2', '厚土', 'maxHpPct', 6, 12, '生命上限提升 {v}%', 60, { minRank: 2 }),
  a('hp3', '长生', 'maxHpPct', 12, 22, '生命上限提升 {v}%', 25, { minRank: 5 }),
  a('hp4', '不灭', 'maxHpPct', 22, 35, '生命上限提升 {v}%', 8, { minRank: 7 }),
  // ---- 暴击 ----
  a('crit1', '会心', 'critRate', 1, 3, '暴击率提升 {v}%', 90, { slots: WJ }),
  a('crit2', '锐目', 'critRate', 3, 6, '暴击率提升 {v}%', 50, { slots: WJ, minRank: 2 }),
  a('crit3', '天瞳', 'critRate', 6, 10, '暴击率提升 {v}%', 20, { slots: WJ, minRank: 5 }),
  // ---- 暴伤 ----
  a('cdmg1', '重击', 'critDamage', 8, 15, '暴击伤害提升 {v}%', 90, { slots: WJ, decimals: 0 }),
  a('cdmg2', '碎玉', 'critDamage', 15, 30, '暴击伤害提升 {v}%', 50, { slots: WJ, minRank: 2, decimals: 0 }),
  a('cdmg3', '裂空', 'critDamage', 30, 50, '暴击伤害提升 {v}%', 20, { slots: WJ, minRank: 5, decimals: 0 }),
  a('cdmg4', '诛天', 'critDamage', 50, 80, '暴击伤害提升 {v}%', 6, { slots: W, minRank: 7, decimals: 0 }),
  // ---- 增伤 ----
  a('dmg1', '破妄', 'damageBonus', 3, 6, '造成伤害提升 {v}%', 90, { slots: WJ }),
  a('dmg2', '诛邪', 'damageBonus', 6, 12, '造成伤害提升 {v}%', 45, { slots: WJ, minRank: 3 }),
  a('dmg3', '屠灭', 'damageBonus', 12, 20, '造成伤害提升 {v}%', 15, { slots: W, minRank: 6 }),
  // ---- 减伤 ----
  a('red1', '云甲', 'damageReduction', 2, 5, '受到伤害降低 {v}%', 90, { slots: A }),
  a('red2', '霞衣', 'damageReduction', 5, 9, '受到伤害降低 {v}%', 45, { slots: A, minRank: 3 }),
  a('red3', '不坏', 'damageReduction', 9, 15, '受到伤害降低 {v}%', 15, { slots: A, minRank: 6 }),
  // ---- 修炼速度 ----
  a('cult1', '静心', 'cultivationSpeed', 3, 6, '修炼速度提升 {v}%'),
  a('cult2', '悟道', 'cultivationSpeed', 6, 12, '修炼速度提升 {v}%', 55, { minRank: 2 }),
  a('cult3', '天启', 'cultivationSpeed', 12, 20, '修炼速度提升 {v}%', 20, { minRank: 5 }),
  a('cult4', '证道', 'cultivationSpeed', 20, 32, '修炼速度提升 {v}%', 6, { minRank: 7 }),
  // ---- 灵气恢复 ----
  a('qi1', '聚灵', 'qiRegen', 4, 8, '灵气恢复提升 {v}%', 90, { slots: AJ }),
  a('qi2', '引灵', 'qiRegen', 8, 16, '灵气恢复提升 {v}%', 50, { slots: AJ, minRank: 2 }),
  a('qi3', '吞灵', 'qiRegen', 16, 28, '灵气恢复提升 {v}%', 18, { slots: AJ, minRank: 5 }),
  // ---- 突破成功率 ----
  a('bt1', '通明', 'breakthroughRate', 1, 2, '突破成功率提升 {v}%', 70, { slots: J }),
  a('bt2', '道基', 'breakthroughRate', 2, 4, '突破成功率提升 {v}%', 35, { slots: J, minRank: 3 }),
  a('bt3', '天命', 'breakthroughRate', 4, 6, '突破成功率提升 {v}%', 12, { slots: J, minRank: 6 }),
  // ---- 气运 ----
  a('luck1', '福缘', 'luck', 2, 5, '气运提升 {v}%', 80, { slots: J }),
  a('luck2', '鸿运', 'luck', 5, 10, '气运提升 {v}%', 40, { slots: J, minRank: 3 }),
  a('luck3', '天眷', 'luck', 10, 15, '气运提升 {v}%', 12, { slots: J, minRank: 6 }),
  // ---- 探索速度 ----
  a('exp1', '疾行', 'explorationSpeed', 4, 8, '历练速度提升 {v}%', 80, { slots: ['boots', ...J] }),
  a('exp2', '御风', 'explorationSpeed', 8, 15, '历练速度提升 {v}%', 40, { slots: ['boots', ...J], minRank: 3 }),
  a('exp3', '缩地', 'explorationSpeed', 15, 25, '历练速度提升 {v}%', 12, { slots: ['boots', ...J], minRank: 6 }),
  // ---- 身法 ----
  a('spd1', '迅捷', 'speed', 3, 6, '出手速度提升 {v}%', 80, { slots: ['boots', 'wrist', ...W] }),
  a('spd2', '流光', 'speed', 6, 12, '出手速度提升 {v}%', 40, { slots: ['boots', 'wrist', ...W], minRank: 3 }),
  a('spd3', '瞬影', 'speed', 12, 20, '出手速度提升 {v}%', 12, { slots: ['boots', ...W], minRank: 6 }),
  // ---- 战斗修为 ----
  a('gain1', '参悟', 'expGain', 4, 8, '战斗所得修为提升 {v}%', 80),
  a('gain2', '明心', 'expGain', 8, 16, '战斗所得修为提升 {v}%', 40, { minRank: 3 }),
  a('gain3', '大彻', 'expGain', 16, 28, '战斗所得修为提升 {v}%', 12, { minRank: 6 }),
  // ---- 灵石 ----
  a('stone1', '聚财', 'spiritStoneGain', 5, 10, '灵石获取提升 {v}%', 80, { slots: J }),
  a('stone2', '点金', 'spiritStoneGain', 10, 20, '灵石获取提升 {v}%', 40, { slots: J, minRank: 3 }),
  a('stone3', '化宝', 'spiritStoneGain', 20, 35, '灵石获取提升 {v}%', 12, { slots: J, minRank: 6 }),
  // ---- 掉落 ----
  a('drop1', '寻宝', 'dropRate', 4, 8, '装备掉落率提升 {v}%', 80, { slots: J }),
  a('drop2', '探骊', 'dropRate', 8, 15, '装备掉落率提升 {v}%', 40, { slots: J, minRank: 3 }),
  a('drop3', '摘星', 'dropRate', 15, 25, '装备掉落率提升 {v}%', 12, { slots: J, minRank: 6 }),
  // ---- 特殊:破甲 ----
  a('pen1', '破甲', 'armorPen', 4, 8, '攻击时无视目标 {v}% 防御', 70, { slots: W }),
  a('pen2', '碎甲', 'armorPen', 8, 15, '攻击时无视目标 {v}% 防御', 35, { slots: W, minRank: 3 }),
  a('pen3', '洞虚', 'armorPen', 15, 25, '攻击时无视目标 {v}% 防御', 10, { slots: W, minRank: 6 }),
  // ---- 特殊:先手 ----
  a('first1', '先发', 'firstStrike', 10, 20, '首回合造成伤害提升 {v}%', 70, { slots: W, decimals: 0 }),
  a('first2', '雷霆', 'firstStrike', 20, 40, '首回合造成伤害提升 {v}%', 30, { slots: W, minRank: 4, decimals: 0 }),
  // ---- 特殊:反击 ----
  a('cnt1', '反击', 'counterRate', 5, 10, '受击后 {v}% 概率反击', 70, { slots: A }),
  a('cnt2', '荆棘', 'counterRate', 10, 20, '受击后 {v}% 概率反击', 30, { slots: A, minRank: 4 }),
  // ---- 特殊:吸血 ----
  a('ls1', '噬血', 'lifesteal', 2, 5, '造成伤害的 {v}% 转化为生命', 70, { slots: W }),
  a('ls2', '血魔', 'lifesteal', 5, 10, '造成伤害的 {v}% 转化为生命', 30, { slots: W, minRank: 4 }),
  a('ls3', '化生', 'lifesteal', 10, 16, '造成伤害的 {v}% 转化为生命', 10, { slots: W, minRank: 7 }),
  // ---- 特殊:开战护盾 ----
  a('shd1', '护体', 'shieldOnStart', 5, 10, '开战获得 {v}% 生命的护盾', 70, { slots: A }),
  a('shd2', '罡罩', 'shieldOnStart', 10, 20, '开战获得 {v}% 生命的护盾', 30, { slots: A, minRank: 4 }),
  a('shd3', '琉璃', 'shieldOnStart', 20, 32, '开战获得 {v}% 生命的护盾', 10, { slots: A, minRank: 7 }),
  // ---- 特殊:处决 ----
  a('exe1', '斩灭', 'executeDamage', 10, 20, '对生命低于三成之敌伤害提升 {v}%', 70, { slots: W, decimals: 0 }),
  a('exe2', '断魂', 'executeDamage', 20, 40, '对生命低于三成之敌伤害提升 {v}%', 30, { slots: W, minRank: 4, decimals: 0 }),
  // ---- 特殊:回合回复 ----
  a('reg1', '回春', 'regenPerRound', 1, 2, '每回合回复 {v}% 生命', 70, { slots: A }),
  a('reg2', '造化', 'regenPerRound', 2, 4, '每回合回复 {v}% 生命', 30, { slots: A, minRank: 4 }),
  a('reg3', '不息', 'regenPerRound', 4, 6, '每回合回复 {v}% 生命', 10, { slots: A, minRank: 7 }),
  // ---- 特殊:闪避 ----
  a('dg1', '轻身', 'dodgeRate', 2, 5, '闪避概率提升 {v}%', 70, { slots: ['boots', ...A] }),
  a('dg2', '虚步', 'dodgeRate', 5, 9, '闪避概率提升 {v}%', 30, { slots: ['boots'], minRank: 4 }),
  a('dg3', '化影', 'dodgeRate', 9, 14, '闪避概率提升 {v}%', 10, { slots: ['boots'], minRank: 7 }),
  // ---- 特殊:濒危减伤 ----
  a('low1', '背水', 'lowHpReduction', 10, 20, '生命低于三成时受伤降低 {v}%', 70, { slots: A, decimals: 0 }),
  a('low2', '涅槃', 'lowHpReduction', 20, 35, '生命低于三成时受伤降低 {v}%', 30, { slots: A, minRank: 4, decimals: 0 }),
  // ---- 特殊:突破返还 ----
  a('rf1', '稳固', 'breakRefund', 5, 10, '突破失败返还 {v}% 损耗修为', 60, { slots: J }),
  a('rf2', '道心', 'breakRefund', 10, 20, '突破失败返还 {v}% 损耗修为', 25, { slots: J, minRank: 4 }),
  // ---- 特殊:双倍掉落 ----
  a('dd1', '丰饶', 'doubleDropRate', 5, 10, '{v}% 概率获得双倍战利品', 60, { slots: J }),
  a('dd2', '满载', 'doubleDropRate', 10, 20, '{v}% 概率获得双倍战利品', 25, { slots: J, minRank: 4 }),
  // ---- 特殊:奇遇 ----
  a('ev1', '奇遇', 'eventLuck', 5, 10, '历练事件概率提升 {v}%', 60, { slots: J }),
  a('ev2', '仙缘', 'eventLuck', 10, 20, '历练事件概率提升 {v}%', 25, { slots: J, minRank: 4 }),
  // ---- 特殊:御雷 ----
  a('tb1', '御雷', 'tribulationResist', 5, 10, '天劫伤害降低 {v}%', 60, { slots: A }),
  a('tb2', '渡厄', 'tribulationResist', 10, 20, '天劫伤害降低 {v}%', 25, { slots: A, minRank: 4 }),
  a('tb3', '劫外', 'tribulationResist', 20, 30, '天劫伤害降低 {v}%', 8, { slots: A, minRank: 7 }),
  // ---- 特殊:连击 ----
  a('cb1', '连击', 'comboRate', 5, 10, '攻击后 {v}% 概率追击', 70, { slots: W }),
  a('cb2', '疾风', 'comboRate', 10, 18, '攻击后 {v}% 概率追击', 30, { slots: W, minRank: 4 }),
  // ---- 特殊:击晕 ----
  a('st1', '震慑', 'stunRate', 3, 6, '攻击 {v}% 概率震慑目标一回合', 70, { slots: W }),
  a('st2', '镇岳', 'stunRate', 6, 12, '攻击 {v}% 概率震慑目标一回合', 30, { slots: W, minRank: 4 }),
  // ---- 补充:寿元 ----
  a('life1', '养寿', 'lifespanPct', 2, 5, '寿元上限提升 {v}%', 50, { slots: J }),
  a('life2', '龟息', 'lifespanPct', 5, 10, '寿元上限提升 {v}%', 20, { slots: J, minRank: 4 }),
  a('life3', '长存', 'lifespanPct', 10, 18, '寿元上限提升 {v}%', 6, { slots: J, minRank: 7 }),
  // ---- 补充:炼丹/炼器 ----
  a('alc1', '丹心', 'alchemyYield', 5, 10, '炼丹产出提升 {v}%', 40, { slots: J }),
  a('alc2', '丹圣', 'alchemyYield', 10, 20, '炼丹产出提升 {v}%', 15, { slots: J, minRank: 4 }),
  a('fg1', '巧手', 'forgeDiscount', 5, 10, '炼器消耗降低 {v}%', 40, { slots: J }),
  a('fg2', '器道', 'forgeDiscount', 10, 20, '炼器消耗降低 {v}%', 15, { slots: J, minRank: 4 }),
  // ---- 流派:背水 ----
  a('bs1', '背水一击', 'lowHpDamage', 15, 25, '生命低于三成时造成伤害提升 {v}%', 55, { slots: W, decimals: 0 }),
  a('bs2', '向死而生', 'lowHpDamage', 25, 40, '生命低于三成时造成伤害提升 {v}%', 22, { slots: W, minRank: 4, decimals: 0 }),
  a('bs3', '绝境道心', 'lowHpDamage', 40, 60, '生命低于三成时造成伤害提升 {v}%', 7, { minRank: 7, decimals: 0 }),
  // ---- 流派:锋芒(满血) ----
  a('fm1', '锋芒', 'fullHpDamage', 10, 18, '生命高于九成时造成伤害提升 {v}%', 55, { slots: W, decimals: 0 }),
  a('fm2', '一鼓作气', 'fullHpDamage', 18, 30, '生命高于九成时造成伤害提升 {v}%', 22, { slots: W, minRank: 4, decimals: 0 }),
  // ---- 流派:罡盾 ----
  a('gs1', '罡盾', 'shieldPower', 8, 15, '持有护盾时造成伤害提升 {v}%', 55, { slots: A, decimals: 0 }),
  a('gs2', '盾魂', 'shieldPower', 15, 25, '持有护盾时造成伤害提升 {v}%', 22, { slots: A, minRank: 4, decimals: 0 }),
  // ---- 流派:连环 ----
  a('lh1', '连环', 'comboDamage', 15, 30, '追击造成的伤害提升 {v}%', 55, { slots: W, decimals: 0 }),
  a('lh2', '风雷九连', 'comboDamage', 30, 50, '追击造成的伤害提升 {v}%', 22, { slots: W, minRank: 4, decimals: 0 }),
  // ---- 流派:锋反 ----
  a('ff1', '锋反', 'counterDamage', 20, 35, '反击造成的伤害提升 {v}%', 55, { slots: A, decimals: 0 }),
  a('ff2', '万刃归返', 'counterDamage', 35, 60, '反击造成的伤害提升 {v}%', 22, { slots: A, minRank: 4, decimals: 0 }),
  // ---- 流派:溢疗成盾 ----
  a('yl1', '余泽', 'overhealShield', 30, 50, '溢出治疗的 {v}% 转化为护盾', 55, { slots: AJ, decimals: 0 }),
  a('yl2', '生生不息', 'overhealShield', 50, 80, '溢出治疗的 {v}% 转化为护盾', 22, { slots: AJ, minRank: 4, decimals: 0 }),
  a('yl3', '造化盾心', 'overhealShield', 80, 120, '溢出治疗的 {v}% 转化为护盾', 7, { minRank: 7, decimals: 0 })
]

const BY_ID = new Map(AFFIXES.map(x => [x.id, x]))

export function affixDef(id: string): AffixDef | undefined {
  return BY_ID.get(id)
}

/** 词条实际数值 = min + (max - min) × roll */
export function affixValue(def: AffixDef, roll: number): number {
  const v = def.min + (def.max - def.min) * Math.max(0, Math.min(1, roll))
  const f = Math.pow(10, def.decimals)
  return Math.round(v * f) / f
}
