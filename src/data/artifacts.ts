/** 法宝池 —— 45 件,拥有被动属性与自动触发的主动神通 */
import type { AnyStatKey, ArtifactDef, ArtifactEffect, QualityId, StatMods } from '@/types'
import { formatPercent } from '@/utils/format'

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
    // 推演得见的,自然打得中 —— 这是本池里唯一带命中的法宝,专治幻影(见 SpecialKey accuracy)
    { luck: 0.06, cultivationSpeed: 0.06, accuracy: 0.06 },
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
    '每 4 回合琴音摄神,打断敌人这一手',
    4,
    { type: 'stun' },
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
    '每 4 回合挥鞭裂其护体,余下回合敌人防御降低 30%',
    4,
    { type: 'sunder', pct: 0.3 },
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
    '每 4 回合镇压四方,定住敌人这一手',
    4,
    { type: 'stun' },
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
  ),

  // ============ 仙界初段(21-25 阶)============
  // 与装备同一条理由:仙界原本四件法宝全在 23 阶,刚飞升的真仙一路上捡到的东西
  // 与「过仙门者方称仙人」毫无关系。此为仙界两端补上本界域的名目与手艺。
  f(
    'af_yunhai',
    '云海幡',
    'immortal',
    21,
    '幡一展,周身便是过仙门那一日的云海',
    { dodgeRate: 0.04, speed: 0.04 },
    '云障',
    '每 4 回合云海四合,获得 13% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.13 },
    'cloud'
  ),
  f(
    'af_xinggui',
    '星轨盘',
    'immortal',
    22,
    '盘上星轨自行转动,转一圈便是一劫',
    { accuracy: 0.06, critRate: 0.03 },
    '星陨',
    '每 3 回合引星陨落,造成 250% 攻击伤害',
    3,
    { type: 'damage', mult: 2.5 },
    'star'
  ),
  f(
    'af_xuanxu',
    '玄虚拂尘',
    'immortal',
    24,
    '拂尘一扬,扫落的不只是尘',
    { attackPct: 0.06, damageBonus: 0.05 },
    '拂尘',
    '每 3 回合扫落敌人气机,造成 230% 攻击伤害并回复其中 60%',
    3,
    { type: 'drain', mult: 2.3, healPct: 0.6 },
    'wind'
  ),
  f(
    'af_yujingyin',
    '玉京道印',
    'immortal',
    25,
    '玉京山上的一枚旧印,落印处仙兵皆伏',
    { defensePct: 0.07, shieldPower: 0.08 },
    '玉京',
    '每 4 回合玉京垂护,敌人伤害降低 18%',
    4,
    { type: 'weaken', pct: 0.18 },
    'gem'
  ),

  // ============ 神界初段(26-29 阶)============
  f(
    'af_shenyuling',
    '神域令旗',
    'divine',
    26,
    '旗出则一方神域随旗而动',
    { attackPct: 0.07, speed: 0.04 },
    '神域',
    '每 3 回合神域压落,造成 270% 攻击伤害',
    3,
    { type: 'damage', mult: 2.7 },
    'shield'
  ),
  f(
    'af_yunshengu',
    '陨神战鼓',
    'divine',
    27,
    '鼓面蒙的是陨神之皮,一响便摄人心神',
    { damageBonus: 0.06, critDamage: 0.12 },
    '战鼓',
    '每 3 回合鼓声催战,造成 250% 攻击伤害并回复其中 50%',
    3,
    { type: 'drain', mult: 2.5, healPct: 0.5 },
    'bell'
  ),
  f(
    'af_wanshendeng',
    '万神灯',
    'divine',
    28,
    '灯里燃的是万神殿堂聚了万年的香火',
    { maxHpPct: 0.07, regenPerRound: 0.01 },
    '香火',
    '每 4 回合香火回照,回复 17% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.17 },
    'flame'
  ),
  f(
    'af_diquefu',
    '帝阙神符',
    'divine',
    29,
    '符上只有一个字,却是帝阙之下九千级天阶的凭据',
    { breakthroughRate: 0.03, luck: 0.04 },
    '帝威',
    '每 4 回合帝威加身,获得 15% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.15 },
    'scroll'
  ),

  // ============ 混沌海(30-32 阶)============
  f(
    'af_zhenlingfan',
    '真灵幡',
    'divine',
    30,
    '幡上真灵浮沉,似是徘徊又似在守着什么',
    { cultivationSpeed: 0.07, qiRegen: 0.08 },
    '真灵',
    '每 4 回合真灵回照,回复 19% 生命',
    4,
    { type: 'heal', pctMaxHp: 0.19 },
    'ghost'
  ),
  f(
    'af_hongmengchi',
    '鸿蒙尺',
    'divine',
    31,
    '一尺量的是天地未判时的长短',
    { armorPen: 0.06, damageBonus: 0.06 },
    '开天',
    '每 3 回合开天一击,造成 290% 攻击伤害',
    3,
    { type: 'damage', mult: 2.9 },
    'wand'
  ),
  f(
    'af_benyuanlian',
    '本源莲台',
    'divine',
    32,
    '莲台托着一点本源,任劫火也烧不动',
    { defensePct: 0.08, damageReduction: 0.05 },
    '本源',
    '每 4 回合本源护持,获得 17% 生命护盾',
    4,
    { type: 'shield', pctMaxHp: 0.17 },
    'leaf'
  ),
  f(
    'af_shenmojing',
    '神魔镜',
    'divine',
    32,
    '镜里照出的是魔,镜外站着的是神',
    { accuracy: 0.06, damageBonus: 0.05 },
    '神魔',
    '每 3 回合神魔噬影,造成 260% 攻击伤害并回复其中 60%',
    3,
    { type: 'drain', mult: 2.6, healPct: 0.6 },
    'circle-dot'
  ),

  /*
   * 第一件防身型法宝。
   *
   * 前面 32 件全在回答「我怎么打你」,没有一件回答「我扛得住你的阴招」。
   * 而震慑是玩家唯一无从招架的状态(十三种敌人会摄魂,中了就是白丢一回合),
   * 战后分析还会明说「N 个回合被震慑打断,节奏尽失」—— 报了病因,却无药可抓。
   * interval 记 1:它不是「每 N 回合出手」,而是随身常在(见 combat.tryStun)。
   */
  f(
    'af_wuxiangzhu',
    '无相念珠',
    'divine',
    31,
    '一串旧念珠,珠子已被摩得发亮',
    { damageReduction: 0.05, maxHpPct: 0.06 },
    '定念',
    '受慑时以七成概率当场挣脱,那一手照出',
    1,
    { type: 'purge', pct: 0.7 },
    'circle-dot'
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
 * 单项效果的封顶 —— 数值只写在这里,战斗与界面文案都读它。
 *
 * 从前这几个上限各写在 combat.ts 的分支里(0.5 / 0.9 / 1),而界面上的神通说明
 * 是**手写死的 0 级文案**:祭炼到九重时,战斗按 ×1.72 算,卡片上印的还是原来的数
 * (实测玄虚拂尘:说明「造成 230% 攻击伤害」,真打出去是 395.6%)。
 * 故把上限收成一份,由同一处给出「某等级下真正生效的数值」(见 artifactEffectValues)。
 */
export const ARTIFACT_WEAKEN_CAP = 0.5
export const ARTIFACT_SUNDER_CAP = 0.5
export const ARTIFACT_PURGE_CAP = 0.9
export const ARTIFACT_DRAIN_HEAL_CAP = 1

/** 祭炼等级带来的效果倍率(越界等级钳回 0..上限) */
export function artifactLevelMult(level: number): number {
  const lv = Math.max(0, Math.min(ARTIFACT_MAX_LEVEL, Math.floor(level || 0)))
  return 1 + lv * ARTIFACT_LEVEL_BONUS
}

/**
 * 某祭炼等级下的法宝被动(随等级同倍放大)。
 *
 * 此前这段乘法在三处各写一遍(属性汇总 store/inventory、背包卡片、图鉴),
 * 谁改了增幅率都得改三回 —— 漏掉的那一处就会安静地说错话。收成一份。
 */
export function artifactPassiveAt(def: ArtifactDef, level = 0): StatMods {
  const mult = artifactLevelMult(level)
  const out: StatMods = {}
  for (const k in def.passive) {
    const key = k as keyof StatMods
    out[key] = (def.passive[key] ?? 0) * mult
  }
  return out
}

export interface ArtifactEffectValues {
  /** 主体数值(伤害倍率 / 生命百分比 / 削弱破甲比例,小数口径) */
  amount: number
  /** 吸命的回血比例(只有 drain 有) */
  heal?: number
}

/**
 * 某祭炼等级下神通**真正生效**的数值 —— 与 combat 同一套口径(含封顶)。
 * 战斗与文案都从这里取值,「显示的数字」与「打出来的数字」不可能再分叉。
 */
export function artifactEffectValues(def: ArtifactDef, level = 0): ArtifactEffectValues {
  const mult = artifactLevelMult(level)
  const eff = def.active.effect
  switch (eff.type) {
    case 'damage':
      return { amount: eff.mult * mult }
    case 'drain':
      return { amount: eff.mult * mult, heal: Math.min(ARTIFACT_DRAIN_HEAL_CAP, eff.healPct * mult) }
    case 'heal':
    case 'shield':
      return { amount: eff.pctMaxHp * mult }
    case 'weaken':
      return { amount: Math.min(ARTIFACT_WEAKEN_CAP, eff.pct * mult) }
    case 'sunder':
      return { amount: Math.min(ARTIFACT_SUNDER_CAP, eff.pct * mult) }
    case 'purge':
      return { amount: Math.min(ARTIFACT_PURGE_CAP, eff.pct * mult) }
    case 'stun':
      // 震慑没有数值 —— 它掐掉的是敌手那一手,不是打掉多少血
      return { amount: 0 }
  }
}

/** 中文成数(净念写的是「七成」而不是「70%」,缩放后得换同一个字的说法) */
const CHENG_WORDS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const

/**
 * 法宝神通在某祭炼等级下的说明。
 *
 * 做法是**把原说明里的数值换掉**,而不是另写一份模板:文案的措辞(「云海四合」
 * 「扫落敌人气机」)是手写的,只有数字会随祭炼变。0 级时结果与原说明逐字相同 ——
 * 这条由 artifactEffects.spec 守着(它就是拿 desc 与 effect 对账的)。
 */
export function artifactActiveText(def: ArtifactDef, level = 0): string {
  const values = artifactEffectValues(def, level)
  const eff = def.active.effect
  if (eff.type === 'stun') return def.active.desc
  if (eff.type === 'purge') {
    const cheng = CHENG_WORDS[Math.max(0, Math.min(CHENG_WORDS.length - 1, Math.round(values.amount * 10) - 1))]!
    return def.active.desc.replace(/[一二三四五六七八九十]成/, `${cheng}成`)
  }
  // 主体数值:吸命有两个百分数(打出的、回补的),其余只有一个
  const pct = formatPercent(values.amount)
  let text = def.active.desc.replace(/(\d+(?:\.\d+)?)\s*%/, pct)
  if (eff.type === 'drain' && values.heal !== undefined) {
    text = text.replace(/(回复其中\s*)(\d+(?:\.\d+)?)\s*%/, `$1${formatPercent(values.heal)}`)
  }
  return text
}

/** 法宝祭炼等级的说法 —— 「阶」是区域层级与装备层级的词,这里另立一名免得两件事混作一件 */
export function artifactLevelLabel(level: number): string {
  const lv = Math.max(0, Math.min(ARTIFACT_MAX_LEVEL, Math.floor(level || 0)))
  return `祭炼 ${lv}/${ARTIFACT_MAX_LEVEL} 重`
}

/** 某类效果的封顶(没有封顶的返回 undefined)—— 与 artifactEffectValues 用的是同一批常数 */
function effectCap(eff: ArtifactEffect): number | undefined {
  switch (eff.type) {
    case 'weaken':
      return ARTIFACT_WEAKEN_CAP
    case 'sunder':
      return ARTIFACT_SUNDER_CAP
    case 'purge':
      return ARTIFACT_PURGE_CAP
    default:
      return undefined
  }
}

export interface ArtifactNextLevelGain {
  /** 目标重数(即 level + 1) */
  level: number
  /** 各被动项的现值 → 下一重值 */
  passive: { key: AnyStatKey; from: number; to: number }[]
  /** 神通主体数值;震慑没有数值,故为 null */
  active: { from: number; to: number; capped: boolean } | null
  /** 吸命的回补比例(只有吸命有) */
  heal?: { from: number; to: number; capped: boolean }
}

/**
 * 祭炼到下一重,具体能多拿多少。
 *
 * 炼化按钮此前只报代价(悟道点 × 灵石),收益留给玩家自己按 ×1.08 心算 ——
 * 而「值不值」正是按下之前要想清楚的事。这里把下一重的账算好交给界面:
 * 被动逐项、神通主体、吸命的回补,顶上封顶的也标出来(再炼也不会更多了)。
 * 已至满重返回 null。
 */
export function artifactNextLevelGain(def: ArtifactDef, level = 0): ArtifactNextLevelGain | null {
  const lv = Math.max(0, Math.min(ARTIFACT_MAX_LEVEL, Math.floor(level || 0)))
  if (lv >= ARTIFACT_MAX_LEVEL) return null
  const next = lv + 1
  const from = artifactEffectValues(def, lv)
  const to = artifactEffectValues(def, next)
  const passive = Object.keys(def.passive).map(k => {
    const key = k as AnyStatKey
    return { key, from: artifactPassiveAt(def, lv)[key] ?? 0, to: artifactPassiveAt(def, next)[key] ?? 0 }
  })
  const cap = effectCap(def.active.effect)
  return {
    level: next,
    passive,
    active:
      def.active.effect.type === 'stun'
        ? null
        : { from: from.amount, to: to.amount, capped: cap !== undefined && to.amount >= cap - 1e-9 },
    heal:
      to.heal === undefined
        ? undefined
        : { from: from.heal ?? 0, to: to.heal, capped: to.heal >= ARTIFACT_DRAIN_HEAL_CAP - 1e-9 }
  }
}

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
