/** 法宝池 —— 32 件,拥有被动属性与自动触发的主动神通 */
import type { ArtifactDef, ArtifactEffect, QualityId, StatMods } from '@/types'

function f(
  id: string,
  name: string,
  quality: QualityId,
  minTier: number,
  desc: string,
  passive: StatMods,
  activeName: string,
  activeDesc: string,
  interval: number,
  effect: ArtifactEffect,
  icon = 'sparkles'
): ArtifactDef {
  return { id, name, desc, icon, quality, minTier, passive, active: { name: activeName, desc: activeDesc, interval, effect } }
}

export const ARTIFACTS: ArtifactDef[] = [
  f(
    'af_muyu',
    '墨玉葫芦',
    'fine',
    1,
    '装过仙酿的葫芦,酒气化作生机',
    { maxHpPct: 0.05 },
    '琼浆',
    '每 4 回合回复 12% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.12 },
    'flask'
  ),
  f(
    'af_lihuo',
    '离火珠',
    'fine',
    2,
    '内封一点离火之精',
    { attackPct: 0.05 },
    '焚天',
    '每 3 回合喷吐真火,造成 220% 攻击伤害',
    3,
    { type: 'damage', mult: 2.2 },
    'flame'
  ),
  f(
    'af_xuantian',
    '玄天镜',
    'excellent',
    3,
    '镜光所照,邪魔退避',
    { defensePct: 0.06 },
    '镜光护体',
    '每 4 回合获得 18% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.18 },
    'shield'
  ),
  f(
    'af_fuyao',
    '缚妖索',
    'excellent',
    4,
    '捆过大妖的绳索,妖气犹存',
    { speed: 0.05 },
    '缚妖',
    '每 4 回合束缚敌人,其攻击降低 20%',
    4,
    { type: 'weaken', pct: 0.2 },
    'link'
  ),
  f(
    'af_leiyin',
    '雷音锤',
    'excellent',
    5,
    '锤落有雷音滚滚',
    { critRate: 0.03 },
    '雷击',
    '每 3 回合降下雷霆,造成 260% 攻击伤害',
    3,
    { type: 'damage', mult: 2.6 },
    'zap'
  ),
  f(
    'af_yujing',
    '玉净瓶',
    'spirit',
    6,
    '瓶中甘露,可涤荡伤痕',
    { maxHpPct: 0.08, qiRegen: 0.06, overhealShield: 0.3 },
    '甘露',
    '每 4 回合回复 20% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.2 },
    'flask'
  ),
  f(
    'af_bagua',
    '八卦炉',
    'spirit',
    7,
    '炉中真火昼夜不熄',
    { attackPct: 0.08, alchemyYield: 0.1 },
    '炉火纯青',
    '每 3 回合喷出三昧真火,造成 300% 攻击伤害',
    3,
    { type: 'damage', mult: 3.0 },
    'flame'
  ),
  f(
    'af_dinghai',
    '定海珠',
    'spirit',
    8,
    '一珠定四海,风浪不兴',
    { defensePct: 0.08, damageReduction: 0.04 },
    '定海',
    '每 4 回合获得 22% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.22 },
    'droplets'
  ),
  f(
    'af_youming',
    '幽冥幡',
    'spirit',
    9,
    '幡动之处,阴风怒号',
    { damageBonus: 0.06, lowHpDamage: 0.1 },
    '摄魂',
    '每 4 回合摄敌心魂,其攻击降低 25%',
    4,
    { type: 'weaken', pct: 0.25 },
    'ghost'
  ),
  f(
    'af_qianji',
    '千机伞',
    'profound',
    10,
    '伞骨千机,开合皆杀阵',
    { dodgeRate: 0.05, defensePct: 0.06, shieldPower: 0.08 },
    '伞阵',
    '每 4 回合获得 26% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.26 },
    'umbrella'
  ),
  f(
    'af_zhenyue',
    '镇岳印',
    'profound',
    11,
    '大印如山,落下时天地都沉了沉',
    { attackPct: 0.1 },
    '镇岳',
    '每 3 回合大印镇压,造成 340% 攻击伤害',
    3,
    { type: 'damage', mult: 3.4 },
    'mountain'
  ),
  f(
    'af_shehun',
    '摄魂铃',
    'profound',
    12,
    '铃声入耳,神魂欲裂',
    { critDamage: 0.15 },
    '摄魂音',
    '每 4 回合铃音慑敌,其攻击降低 30%',
    4,
    { type: 'weaken', pct: 0.3 },
    'bell'
  ),
  f(
    'af_xingpan',
    '周天星盘',
    'profound',
    13,
    '推演周天,窥探命数',
    { luck: 0.06, cultivationSpeed: 0.06 },
    '星辉',
    '每 4 回合引星辉入体,回复 24% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.24 },
    'star'
  ),
  f(
    'af_chixiao',
    '赤霄鼎',
    'earth',
    14,
    '鼎中可炼万物,亦可炼敌',
    { attackPct: 0.12, maxHpPct: 0.08 },
    '鼎炼',
    '每 3 回合鼎压四方,造成 380% 攻击伤害',
    3,
    { type: 'damage', mult: 3.8 },
    'flame'
  ),
  f(
    'af_bishui',
    '碧水珠',
    'earth',
    15,
    '珠内自有一方碧海',
    { maxHpPct: 0.12, qiRegen: 0.1 },
    '碧波',
    '每 4 回合碧波洗身,回复 28% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.28 },
    'droplets'
  ),
  f(
    'af_shiling',
    '噬灵幡',
    'earth',
    16,
    '幡面绣着无数张开的口',
    { damageBonus: 0.1, lifesteal: 0.04 },
    '噬灵',
    '每 3 回合幡卷灵力,造成 400% 攻击伤害',
    3,
    { type: 'damage', mult: 4.0 },
    'ghost'
  ),
  f(
    'af_taixu',
    '太虚镜',
    'heaven',
    17,
    '照见太虚,万法无所遁形',
    { defensePct: 0.14, damageReduction: 0.06 },
    '太虚照影',
    '每 4 回合获得 32% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.32 },
    'shield'
  ),
  f(
    'af_zhanxian',
    '斩仙飞刀',
    'heaven',
    18,
    '刀出请君入瓮,仙人亦难幸免',
    { critRate: 0.06, critDamage: 0.25 },
    '斩仙',
    '每 3 回合飞刀取首,造成 460% 攻击伤害',
    3,
    { type: 'damage', mult: 4.6 },
    'sword'
  ),
  f(
    'af_hundun',
    '混沌钟',
    'immortal',
    19,
    '钟声荡开,时光都慢了半拍',
    { attackPct: 0.12, defensePct: 0.12, maxHpPct: 0.12 },
    '混沌钟鸣',
    '每 3 回合钟镇万物,造成 500% 攻击伤害',
    3,
    { type: 'damage', mult: 5.0 },
    'bell'
  ),
  f(
    'af_zaohua',
    '造化玉碟',
    'divine',
    20,
    '记载造化至理的残碟',
    { cultivationSpeed: 0.2, breakthroughRate: 0.04, luck: 0.08 },
    '造化',
    '每 4 回合造化加身,回复 40% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.4 },
    'star'
  ),

  // ============ 仙界及以上法宝(tier 21+)============
  f(
    'af_xianding',
    '仙鼎',
    'immortal',
    23,
    '一鼎仙火不熄,药气缭绕可愈百伤',
    { maxHpPct: 0.06, qiRegen: 0.06 },
    '仙火回春',
    '每 4 回合仙火护主,回复 15% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.15 },
    'flask'
  ),
  f(
    'af_xianqin',
    '仙琴',
    'immortal',
    23,
    '琴音出则万籁寂,敌势为之一挫',
    { attackPct: 0.06, luck: 0.04 },
    '摄心',
    '每 4 回合琴音摄神,敌人伤害降低 15%',
    4,
    { type: 'weaken', pct: 0.15 },
    'scroll'
  ),
  f(
    'af_shenzhong',
    '神钟',
    'divine',
    28,
    '钟声一响,神域同震',
    { defensePct: 0.07, damageReduction: 0.04 },
    '神钟护体',
    '每 4 回合神钟自成壁垒,获得 14% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.14 },
    'bell'
  ),
  f(
    'af_shenbian',
    '神鞭',
    'divine',
    28,
    '一鞭抽落星辰,余响三日不绝',
    { attackPct: 0.07, speed: 0.05 },
    '裂星',
    '每 3 回合挥鞭劈落,造成 240% 攻击伤害',
    3,
    { type: 'damage', mult: 2.4 },
    'wand'
  ),
  f(
    'af_hundunfu',
    '混沌开天斧',
    'divine',
    31,
    '一切尚未开始时,它便在此',
    { attackPct: 0.08, armorPen: 0.06 },
    '开天',
    '每 3 回合开天一击,造成 280% 攻击伤害',
    3,
    { type: 'damage', mult: 2.8 },
    'axe'
  ),
  f(
    'af_benyuanzhu',
    '本源珠',
    'divine',
    31,
    '珠中一界,自成生灭',
    { cultivationSpeed: 0.08, maxHpPct: 0.06 },
    '本源滋养',
    '每 4 回合本源涌动,回复 18% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.18 },
    'gem'
  ),
  // 高界补两件:法宝位只有两个,一个界域若只给两件,「带上就完事」——取舍就没有了
  f(
    'af_xianjian',
    '青锋仙剑',
    'immortal',
    23,
    '剑光过处,仙庭无声',
    { attackPct: 0.06, critRate: 0.03 },
    '斩尘',
    '每 3 回合剑气纵横,造成 240% 攻击伤害',
    3,
    { type: 'damage', mult: 2.4 },
    'sword'
  ),
  f(
    'af_yunwen',
    '云纹仙印',
    'immortal',
    23,
    '印上云纹流动,身随云走',
    { speed: 0.05, dodgeRate: 0.04 },
    '云行',
    '每 4 回合踏云掠影,获得 12% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.12 },
    'wind'
  ),
  f(
    'af_zhenshen',
    '镇神印',
    'divine',
    28,
    '一印落下,神域皆静',
    { damageReduction: 0.05, maxHpPct: 0.07 },
    '镇神',
    '每 3 回合镇压四方,敌人伤害降低 18%',
    3,
    { type: 'weaken', pct: 0.18 },
    'gem'
  ),
  f(
    'af_shenlei',
    '神雷珠',
    'divine',
    28,
    '珠内藏一道不散的神雷',
    { attackPct: 0.06, damageBonus: 0.06 },
    '雷殛',
    '每 3 回合引雷加身,造成 260% 攻击伤害',
    3,
    { type: 'damage', mult: 2.6 },
    'zap'
  ),
  f(
    'af_qinglian',
    '混沌青莲',
    'divine',
    31,
    '莲开于混沌未判之时,不染不灭',
    { cultivationSpeed: 0.08, qiRegen: 0.08 },
    '莲开',
    '每 4 回合青莲护身,获得 16% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.16 },
    'leaf'
  ),
  f(
    'af_xujiesuo',
    '虚界梭',
    'divine',
    31,
    '一梭穿虚,来去皆不留痕',
    { luck: 0.06, dropRate: 0.06, explorationSpeed: 0.06 },
    '虚空挪移',
    '每 4 回合挪移虚界,敌人伤害降低 20%',
    4,
    { type: 'weaken', pct: 0.2 },
    'sparkles'
  )
]

const BY_ID = new Map(ARTIFACTS.map(x => [x.id, x]))

export function artifactDef(id: string): ArtifactDef | undefined {
  return BY_ID.get(id)
}

/** 法宝每级对被动/主动数值的增幅 */
export const ARTIFACT_LEVEL_BONUS = 0.08
export const ARTIFACT_MAX_LEVEL = 9
export const ARTIFACT_UP_WUDAO_BASE = 6
export const ARTIFACT_UP_STONE_TIER = 40

/**
 * 法宝位:开局 1 位,元婴(第 3 大境界)起再开 1 位。
 *
 * 这条规则此前写在两处(界面的槽位显示、切换构筑时的截断),数字各写各的;
 * 界面还会把门槛写成「元婴境开启第二法宝位」——境界改名或门槛挪动,文案就撒谎。
 * 故门槛与上限一并放这里,两边都读同一份。
 */
export const ARTIFACT_SLOT_UNLOCK_MAJOR = 3
export const ARTIFACT_MAX_SLOTS = 2

/** 某大境界下可用几个法宝位 */
export function artifactSlotsFor(major: number): number {
  return major >= ARTIFACT_SLOT_UNLOCK_MAJOR ? ARTIFACT_MAX_SLOTS : 1
}
