/** 敌人库 —— 60 个,含 20 名区域首领;多段/真伤/闪避等机制用于流派克制 */
import type { BossArchetype, BossPhase, ElementId, EnemyDef, EnemySkill, StatMods } from '@/types'

function e(
  id: string,
  name: string,
  tier: number,
  icon: string,
  mults: [hp: number, atk: number, def: number, speed: number],
  skills: EnemySkill[],
  opts: { boss?: boolean; element?: ElementId; mods?: StatMods; archetype?: BossArchetype; phases?: BossPhase[] } = {}
): EnemyDef {
  return {
    id,
    name,
    tier,
    icon,
    hpMult: mults[0],
    atkMult: mults[1],
    defMult: mults[2],
    speed: mults[3],
    skills,
    isBoss: opts.boss,
    element: opts.element,
    mods: opts.mods,
    archetype: opts.archetype,
    phases: opts.phases
  }
}

const bite = (name = '撕咬', mult = 1.4, rate = 0.25): EnemySkill => ({ name, mult, rate })
const heavy = (name: string, mult: number, rate = 0.2): EnemySkill => ({ name, mult, rate })

export const ENEMIES: EnemyDef[] = [
  // t1 青云山麓
  e('e_wolf', '赤目野狼', 1, 'paw', [0.9, 1.0, 0.8, 1.0], [bite()]),
  e('e_boar', '山间野猪', 1, 'paw', [1.2, 0.9, 1.0, 0.85], [heavy('猪突', 1.6, 0.18)]),
  e('e_wolfking', '独角妖狼', 1, 'skull', [2.8, 1.3, 0.85, 1.15], [{ name: '裂空爪', mult: 1.8, rate: 0.3 }], { boss: true, archetype: 'berserk', phases: [{ hpThreshold: 0.5, modChanges: { damageBonus: 0.5 }, skillChanges: [{ name: '狂化·裂空', mult: 2.2, rate: 0.4 }], label: '狂化' }] }),
  // t2 落霞谷
  e('e_sparrow', '落霞灵雀', 2, 'bird', [0.8, 1.1, 0.7, 1.25], [heavy('霞光啄', 1.5, 0.25)]),
  e('e_stoneape', '谷中石猿', 2, 'paw', [1.3, 1.0, 1.2, 0.9], [heavy('投石', 1.5, 0.2)]),
  e('e_python', '霞光巨蟒', 2, 'skull', [4.0, 1.1, 1.5, 1.0], [{ name: '绞缠', mult: 1.2, rate: 0.4, effect: 'multi' }], { boss: true, archetype: 'counter', mods: { counterRate: 0.25 }, phases: [{ hpThreshold: 0.5, modChanges: { counterRate: 0.45 }, skillChanges: [{ name: '绞缠·缠绕', mult: 1.5, rate: 0.45, effect: 'multi' }], label: '缠绕' }] }),
  // t3 黑风林
  e('e_bwolf', '黑风狼', 3, 'paw', [1.0, 1.1, 0.9, 1.15], [bite('黑风爪', 1.5)], { element: 'wind' }),
  e('e_vine', '噬人藤', 3, 'leaf', [1.4, 0.9, 1.2, 0.7], [{ name: '缠绕吸血', mult: 1.3, rate: 0.3, effect: 'drain' }], {
    element: 'wood'
  }),
  e('e_bwking', '黑风妖王', 3, 'skull', [3.2, 1.6, 1.6, 1.05], [heavy('黑风啸', 1.8, 0.3)], { boss: true, element: 'wind', archetype: 'spellbane', mods: { damageReduction: 0.15 }, phases: [{ hpThreshold: 0.5, modChanges: { damageReduction: 0.3 }, label: '噬法' }] }),
  // t4 寒潭幽窟
  e('e_snake', '寒潭水蛇', 4, 'droplets', [1.0, 1.1, 0.9, 1.1], [{ name: '寒毒', mult: 1.4, rate: 0.28, effect: 'bleed' }], {
    element: 'water'
  }),
  e('e_bat', '幽窟蝙蝠', 4, 'bird', [0.85, 1.15, 0.8, 1.3], [{ name: '音波', mult: 1.4, rate: 0.25, effect: 'stun' }], { element: 'dark' }),
  e('e_icejiao', '玄冰蛟', 4, 'skull', [3.4, 1.5, 1.3, 1.1], [{ name: '冰封吐息', mult: 1.6, rate: 0.35, effect: 'pierce' }], { boss: true, element: 'ice', archetype: 'truedmg', phases: [{ hpThreshold: 0.6, skillChanges: [{ name: '冰封·贯体', mult: 2.3, rate: 0.35, effect: 'pierce' }], label: '冰封贯体' }] }),
  // t5 万妖林
  e('e_fox', '三尾灵狐', 5, 'paw', [0.95, 1.2, 0.85, 1.25], [{ name: '魅惑', mult: 1.5, rate: 0.25, effect: 'stun' }], {
    mods: { dodgeRate: 0.15 }
  }),
  e('e_bear', '铁背妖熊', 5, 'paw', [1.5, 1.05, 1.3, 0.8], [heavy('熊霸一击', 1.8, 0.22)]),
  e('e_forestlord', '万妖林主', 5, 'skull', [4.6, 1.2, 1.4, 0.95], [heavy('万妖齐鸣', 2.0, 0.3)], { boss: true, element: 'wood', archetype: 'attrition', mods: { regenPerRound: 0.015 }, phases: [{ hpThreshold: 0.5, modChanges: { regenPerRound: 0.04 }, label: '万妖觉醒' }] }),
  // t6 古战场遗迹
  e('e_soldier', '残魂兵俑', 6, 'ghost', [1.1, 1.1, 1.1, 0.95], [heavy('残戈', 1.5, 0.25)], { element: 'dark' }),
  e('e_knight', '怨灵骑士', 6, 'ghost', [1.2, 1.2, 1.0, 1.1], [{ name: '怨气冲锋', mult: 1.7, rate: 0.25, effect: 'bleed' }], {
    element: 'dark'
  }),
  e('e_general', '古将军亡魂', 6, 'skull', [3.6, 1.4, 1.9, 1.0], [{ name: '将军令', mult: 2.0, rate: 0.28, effect: 'shield' }], {
    boss: true,
    element: 'dark',
    archetype: 'threshold',
    mods: { shieldOnStart: 0.25 },
    phases: [{ hpThreshold: 0.5, modChanges: { shieldOnStart: 0.45 }, label: '将军誓' }]
  }),
  // t7 赤炎火域
  e('e_firewolf', '赤炎狼', 7, 'flame', [1.05, 1.25, 0.9, 1.15], [heavy('炎爪', 1.6, 0.28)], { element: 'fire' }),
  e('e_golem', '火岩傀儡', 7, 'mountain', [1.6, 1.0, 1.5, 0.7], [{ name: '熔岩护体', mult: 1.4, rate: 0.25, effect: 'shield' }], {
    element: 'fire'
  }),
  e('e_firelord', '炎狱魔君', 7, 'skull', [3.8, 2.2, 1.0, 1.2], [heavy('炎狱焚天', 2.1, 0.3)], { boss: true, element: 'fire', archetype: 'berserk', mods: { critRate: 0.15 }, phases: [{ hpThreshold: 0.5, modChanges: { damageBonus: 0.5 }, skillChanges: [{ name: '炎狱·焚天', mult: 2.6, rate: 0.4 }], label: '焚天' }] }),
  // t8 幽冥海
  e('e_shark', '幽冥鬼鲛', 8, 'fish', [1.15, 1.25, 0.95, 1.2], [bite('鲛噬', 1.7, 0.28)], { element: 'water' }),
  e('e_corpse', '海底沉尸', 8, 'ghost', [1.5, 1.0, 1.3, 0.75], [{ name: '尸毒', mult: 1.4, rate: 0.3, effect: 'bleed' }], {
    element: 'dark'
  }),
  e('e_seaking', '幽冥海皇', 8, 'skull', [5.0, 1.1, 1.4, 1.0], [{ name: '幽冥潮汐', mult: 1.2, rate: 0.5, effect: 'drain' }, { name: '潮汐回复', mult: 1.0, rate: 0.2, effect: 'drain' }], {
    boss: true,
    element: 'water',
    archetype: 'antiheal',
    mods: { lifesteal: 0.15 },
    phases: [{ hpThreshold: 0.5, modChanges: { lifesteal: 0.3, damageReduction: 0.15 }, label: '潮汐涌动' }]
  }),
  // t9 迷雾沼泽
  e('e_pyth2', '瘴毒巨蟒', 9, 'skull', [1.3, 1.2, 1.0, 0.95], [{ name: '毒瘴', mult: 1.5, rate: 0.3, effect: 'bleed' }], {
    element: 'wood'
  }),
  e('e_mud', '沼泽泥怪', 9, 'droplets', [1.7, 0.95, 1.4, 0.65], [{ name: '泥沼吞噬', mult: 1.5, rate: 0.25, effect: 'stun' }], {
    element: 'earth'
  }),
  e('e_poisonlord', '万毒老祖', 9, 'skull', [5.2, 1.2, 1.3, 0.95], [{ name: '万毒噬心', mult: 1.5, rate: 0.4, effect: 'bleed' }], {
    boss: true,
    element: 'wood',
    archetype: 'attrition',
    mods: { regenPerRound: 0.02, lifesteal: 0.12 },
    phases: [{ hpThreshold: 0.5, modChanges: { regenPerRound: 0.05, lifesteal: 0.25 }, label: '万毒沸腾' }]
  }),
  // t10 剑冢
  e('e_swordpuppet', '剑灵傀儡', 10, 'sword', [1.1, 1.35, 1.0, 1.15], [heavy('剑气纵横', 1.8, 0.3)], { element: 'metal' }),
  e('e_brokensword', '断剑残魂', 10, 'sword', [0.95, 1.45, 0.85, 1.25], [{ name: '残剑一斩', mult: 1.6, rate: 0.3, effect: 'pierce' }], {
    element: 'metal'
  }),
  e('e_swordlord', '剑冢之主', 10, 'skull', [4.2, 1.7, 1.4, 1.05], [{ name: '万剑归一', mult: 1.8, rate: 0.35, effect: 'pierce' }], { boss: true, element: 'metal', archetype: 'truedmg', mods: { critDamage: 0.5 }, phases: [{ hpThreshold: 0.6, skillChanges: [{ name: '万剑·贯体', mult: 2.7, rate: 0.35, effect: 'pierce' }], label: '万剑贯体' }] }),
  // t11 雷泽
  e('e_leijiao', '雷泽妖蛟', 11, 'zap', [1.25, 1.3, 1.05, 1.1], [{ name: '雷吻', mult: 1.8, rate: 0.28, effect: 'stun' }], {
    element: 'thunder'
  }),
  e('e_zeagle', '紫雷鹰', 11, 'bird', [0.95, 1.15, 0.9, 1.35], [{ name: '雷羽连击', mult: 1.2, rate: 0.4, effect: 'multi' }], {
    element: 'thunder',
    mods: { dodgeRate: 0.1 }
  }),
  e('e_leidi', '雷帝残念', 11, 'skull', [4.6, 2.3, 0.85, 1.2], [{ name: '九霄神雷', mult: 2.4, rate: 0.3, effect: 'stun' }], {
    boss: true,
    element: 'thunder',
    archetype: 'berserk',
    phases: [{ hpThreshold: 0.5, modChanges: { damageBonus: 0.5 }, skillChanges: [{ name: '九霄·灭世', mult: 2.8, rate: 0.4, effect: 'stun' }], label: '灭世' }]
  }),
  // t12 昆仑雪岭
  e('e_iceape', '雪岭冰猿', 12, 'mountain', [1.4, 1.2, 1.25, 0.9], [heavy('冰锤', 1.8, 0.25)], { element: 'ice' }),
  e('e_frostwolf', '霜狼', 12, 'paw', [1.1, 1.3, 1.0, 1.2], [bite('霜牙', 1.7, 0.3)], { element: 'ice' }),
  e('e_icefairy', '堕落冰魄仙子', 12, 'skull', [4.8, 1.5, 1.2, 1.3], [{ name: '冰魄寒光', mult: 1.7, rate: 0.35, effect: 'pierce' }], {
    boss: true,
    element: 'ice',
    archetype: 'evasive',
    mods: { dodgeRate: 0.3 },
    phases: [{ hpThreshold: 0.5, modChanges: { dodgeRate: 0.5 }, label: '冰魄化身' }]
  }),
  // t13 荒古妖庭
  e('e_guard', '妖庭卫士', 13, 'shield', [1.3, 1.3, 1.2, 1.0], [heavy('妖庭戟法', 1.9, 0.28)]),
  e('e_hydra', '九头妖蛇', 13, 'skull', [1.6, 1.05, 1.1, 0.9], [{ name: '九首齐噬', mult: 1.1, rate: 0.45, effect: 'multi' }]),
  e('e_yaosheng', '荒古妖圣', 13, 'skull', [6.0, 1.3, 1.5, 1.0], [heavy('妖圣威压', 2.5, 0.3)], { boss: true, archetype: 'attrition', mods: { regenPerRound: 0.02 }, phases: [{ hpThreshold: 0.5, modChanges: { regenPerRound: 0.05, damageBonus: 0.3 }, label: '妖圣临世' }] }),
  // t14 沉沙古城
  e('e_sandzombie', '沙化行尸', 14, 'ghost', [1.5, 1.15, 1.3, 0.8], [{ name: '沙暴撕扯', mult: 1.7, rate: 0.28, effect: 'bleed' }], {
    element: 'earth'
  }),
  e('e_gargoyle', '石像鬼', 14, 'mountain', [1.4, 1.3, 1.4, 0.95], [{ name: '石化凝视', mult: 1.8, rate: 0.25, effect: 'stun' }], {
    element: 'earth'
  }),
  e('e_citylord', '古城域主', 14, 'skull', [5.2, 1.5, 1.9, 1.0], [{ name: '黄沙百战', mult: 1.3, rate: 0.4, effect: 'pierce' }], {
    boss: true,
    element: 'earth',
    archetype: 'threshold',
    mods: { shieldOnStart: 0.3 },
    phases: [{ hpThreshold: 0.5, modChanges: { shieldOnStart: 0.5, damageReduction: 0.2 }, label: '黄沙壁垒' }]
  }),
  // t15 蜃楼幻海
  e('e_shen', '蜃妖', 15, 'cloud', [1.3, 1.4, 1.1, 1.15], [{ name: '幻境迷心', mult: 1.9, rate: 0.3, effect: 'stun' }], {
    element: 'water'
  }),
  e('e_rakshasa', '幻海罗刹', 15, 'ghost', [1.2, 1.25, 1.0, 1.25], [{ name: '罗刹血爪', mult: 1.15, rate: 0.4, effect: 'multi' }], {
    element: 'dark',
    mods: { dodgeRate: 0.12 }
  }),
  e('e_shenlord', '蜃楼之主', 15, 'skull', [5.4, 1.6, 1.3, 1.35], [{ name: '海市蜃楼', mult: 1.3, rate: 0.4, effect: 'multi' }], { boss: true, element: 'water', archetype: 'evasive', mods: { dodgeRate: 0.35 }, phases: [{ hpThreshold: 0.5, modChanges: { dodgeRate: 0.55 }, label: '蜃楼幻境' }] }),
  // t16 九幽魔渊
  e('e_devil', '魔渊恶鬼', 16, 'ghost', [1.35, 1.45, 1.15, 1.1], [{ name: '恶鬼噬魂', mult: 2.0, rate: 0.3, effect: 'drain' }], {
    element: 'dark'
  }),
  e('e_demongen', '噬魂魔将', 16, 'skull', [1.5, 1.5, 1.25, 1.05], [{ name: '魔刀断岳', mult: 1.7, rate: 0.28, effect: 'pierce' }], {
    element: 'dark'
  }),
  e('e_demonlord', '九幽魔尊', 16, 'skull', [6.4, 1.2, 1.5, 1.05], [{ name: '九幽噬天', mult: 2.7, rate: 0.32, effect: 'drain' }], {
    boss: true,
    element: 'dark',
    archetype: 'antiheal',
    mods: { lifesteal: 0.2 },
    phases: [{ hpThreshold: 0.5, modChanges: { lifesteal: 0.35, damageReduction: 0.15 }, label: '九幽归一' }]
  }),
  // t17 星陨荒原
  e('e_starpuppet', '星陨傀儡', 17, 'star', [1.5, 1.4, 1.4, 0.9], [{ name: '星辉贯穿炮', mult: 1.6, rate: 0.3, effect: 'pierce' }], {
    element: 'light'
  }),
  e('e_meteorbeast', '陨铁兽', 17, 'mountain', [1.7, 1.35, 1.5, 0.85], [heavy('陨铁冲撞', 2.0, 0.28)], { element: 'metal' }),
  e('e_starbeast', '星空古兽', 17, 'skull', [6.0, 2.4, 1.0, 1.1], [heavy('吞星', 2.8, 0.3)], { boss: true, element: 'light', archetype: 'berserk', mods: { armorPen: 0.2 }, phases: [{ hpThreshold: 0.5, modChanges: { damageBonus: 0.6 }, skillChanges: [{ name: '吞星·爆裂', mult: 3.2, rate: 0.4 }], label: '爆裂' }] }),
  // t18 天外天
  e('e_outsider', '天外来客', 18, 'cloud', [1.4, 1.55, 1.25, 1.2], [heavy('域外神通', 2.3, 0.3)]),
  e('e_voidfish', '虚空游鱼', 18, 'fish', [1.2, 1.6, 1.1, 1.4], [{ name: '虚空穿梭', mult: 2.2, rate: 0.3, effect: 'stun' }], {
    mods: { dodgeRate: 0.25 }
  }),
  e('e_voidgod', '虚空古神', 18, 'skull', [5.8, 1.8, 1.4, 1.1], [{ name: '湮灭之瞳', mult: 2.2, rate: 0.35, effect: 'pierce' }], { boss: true, archetype: 'truedmg', phases: [{ hpThreshold: 0.6, skillChanges: [{ name: '湮灭·贯穿', mult: 3.4, rate: 0.35, effect: 'pierce' }], label: '贯穿' }] }),
  // t19 仙人遗府
  e('e_xiangui', '守府仙傀', 19, 'shield', [1.6, 1.5, 1.5, 1.0], [{ name: '仙法禁制', mult: 2.3, rate: 0.3, effect: 'shield' }], {
    element: 'light'
  }),
  e('e_shilin', '仙府石麟', 19, 'paw', [1.8, 1.45, 1.6, 0.9], [heavy('麒麟踏天', 2.4, 0.28)], { element: 'light' }),
  e('e_fuling', '仙府之灵', 19, 'skull', [6.2, 1.5, 1.9, 1.05], [{ name: '仙府万法', mult: 3.0, rate: 0.32, effect: 'shield' }], {
    boss: true,
    element: 'light',
    archetype: 'threshold',
    mods: { shieldOnStart: 0.35 },
    phases: [{ hpThreshold: 0.5, modChanges: { shieldOnStart: 0.55, damageReduction: 0.25 }, label: '仙府结界' }]
  }),
  // t20 鸿蒙裂隙
  e('e_hmbeast', '鸿蒙残兽', 20, 'paw', [1.7, 1.6, 1.4, 1.1], [heavy('鸿蒙撕咬', 2.5, 0.3)], { element: 'chaos' }),
  e('e_chaosshadow', '混沌魔影', 20, 'ghost', [1.5, 1.7, 1.3, 1.25], [{ name: '混沌侵蚀', mult: 2.4, rate: 0.32, effect: 'drain' }], {
    element: 'chaos'
  }),
  e('e_hmdemon', '鸿蒙古魔', 20, 'skull', [6.6, 2.6, 1.1, 1.2], [heavy('开天魔焰', 3.2, 0.32)], { boss: true, element: 'chaos', archetype: 'berserk', phases: [{ hpThreshold: 0.5, modChanges: { damageBonus: 0.7 }, skillChanges: [{ name: '开天·灭世', mult: 3.6, rate: 0.4, effect: 'pierce' }], label: '灭世' }] })
]

const BY_ID = new Map(ENEMIES.map(x => [x.id, x]))

export function enemyDef(id: string): EnemyDef | undefined {
  return BY_ID.get(id)
}
