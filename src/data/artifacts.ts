/** 法宝池 —— 20 件,拥有被动属性与自动触发的主动神通 */
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
