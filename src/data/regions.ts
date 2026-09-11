/**
 * 历练区域 —— 32 处,层级递进,击败首领解锁下一区域。
 *
 * 1-20 层属人间界(旧表原样保留);21 层起每层一处,依次对应
 * 仙界/神界/混沌海的新境界(minRealm 9-20)。凡界路线生成只取人间界部分,
 * 见 MORTAL_REGIONS。
 */
import type { RegionDef } from '@/types'

function r(
  id: string,
  name: string,
  tier: number,
  minRealm: number,
  danger: RegionDef['danger'],
  icon: string,
  desc: string,
  enemies: string[],
  boss: string,
  eventTags: string[],
  requireCleared?: string
): RegionDef {
  return { id, name, tier, minRealm, danger, icon, desc, enemies, boss, eventTags, requireCleared }
}

export const REGIONS: RegionDef[] = [
  r('qingyun', '青云山麓', 1, 0, 1, 'mountain', '云雾缭绕的山麓,是初入仙途者的试炼之地', ['e_wolf', 'e_boar'], 'e_wolfking', [
    'general',
    'mountain'
  ]),
  r(
    'luoxia',
    '落霞谷',
    2,
    0,
    1,
    'sunset',
    '每逢黄昏,满谷霞光如焚',
    ['e_sparrow', 'e_stoneape'],
    'e_python',
    ['general', 'mountain'],
    'qingyun'
  ),
  r(
    'heifeng',
    '黑风林',
    3,
    1,
    2,
    'trees',
    '林中黑风终年不散,吹人骨髓生寒',
    ['e_bwolf', 'e_vine'],
    'e_bwking',
    ['general', 'forest'],
    'luoxia'
  ),
  r(
    'hantan',
    '寒潭幽窟',
    4,
    1,
    2,
    'droplets',
    '幽潭之下别有洞天,寒气砭骨',
    ['e_snake', 'e_bat'],
    'e_icejiao',
    ['general', 'water'],
    'heifeng'
  ),
  r(
    'wanyao',
    '万妖林',
    5,
    1,
    2,
    'trees',
    '万妖聚居之地,机缘与凶险并存',
    ['e_fox', 'e_bear'],
    'e_forestlord',
    ['general', 'forest'],
    'hantan'
  ),
  r(
    'guzhanchang',
    '古战场遗迹',
    6,
    2,
    3,
    'sword',
    '上古大战的残迹,怨气凝而不散',
    ['e_soldier', 'e_knight'],
    'e_general',
    ['general', 'ruin'],
    'wanyao'
  ),
  r(
    'chiyan',
    '赤炎火域',
    7,
    2,
    3,
    'flame',
    '地火奔涌,寸草不生',
    ['e_firewolf', 'e_golem'],
    'e_firelord',
    ['general', 'fire'],
    'guzhanchang'
  ),
  r(
    'youminghai',
    '幽冥海',
    8,
    3,
    3,
    'waves',
    '海面漆黑如墨,不见天日',
    ['e_shark', 'e_corpse'],
    'e_seaking',
    ['general', 'water', 'dark'],
    'chiyan'
  ),
  r(
    'miwu',
    '迷雾沼泽',
    9,
    3,
    3,
    'cloud',
    '瘴雾弥漫,一步踏错便是万劫不复',
    ['e_pyth2', 'e_mud'],
    'e_poisonlord',
    ['general', 'forest'],
    'youminghai'
  ),
  r(
    'jianzhong',
    '剑冢',
    10,
    3,
    4,
    'sword',
    '埋葬万剑之地,剑气冲霄',
    ['e_swordpuppet', 'e_brokensword'],
    'e_swordlord',
    ['general', 'ruin', 'sword'],
    'miwu'
  ),
  r(
    'leize',
    '雷泽',
    11,
    4,
    4,
    'zap',
    '雷霆万年不歇,是炼体悟道的绝地',
    ['e_leijiao', 'e_zeagle'],
    'e_leidi',
    ['general', 'thunder'],
    'jianzhong'
  ),
  r(
    'kunlun',
    '昆仑雪岭',
    12,
    4,
    4,
    'mountain',
    '万古冰封的圣山,藏着上古秘辛',
    ['e_iceape', 'e_frostwolf'],
    'e_icefairy',
    ['general', 'mountain', 'ice'],
    'leize'
  ),
  r(
    'yaoting',
    '荒古妖庭',
    13,
    5,
    4,
    'crown',
    '妖族古庭的废墟,妖威犹存',
    ['e_guard', 'e_hydra'],
    'e_yaosheng',
    ['general', 'ruin'],
    'kunlun'
  ),
  r(
    'chensha',
    '沉沙古城',
    14,
    5,
    4,
    'castle',
    '黄沙之下,埋着一座千年古城',
    ['e_sandzombie', 'e_gargoyle'],
    'e_citylord',
    ['general', 'ruin'],
    'yaoting'
  ),
  r(
    'shenlou',
    '蜃楼幻海',
    15,
    6,
    5,
    'cloud',
    '真真幻幻,迷失其中者不知凡几',
    ['e_shen', 'e_rakshasa'],
    'e_shenlord',
    ['general', 'water'],
    'chensha'
  ),
  r('moyuan', '九幽魔渊', 16, 6, 5, 'skull', '深渊之下,魔气滔天', ['e_devil', 'e_demongen'], 'e_demonlord', ['general', 'dark'], 'shenlou'),
  r(
    'xingyun',
    '星陨荒原',
    17,
    7,
    5,
    'star',
    '星辰坠落之地,遍地陨铁星髓',
    ['e_starpuppet', 'e_meteorbeast'],
    'e_starbeast',
    ['general', 'sky'],
    'moyuan'
  ),
  r(
    'tianwaitian',
    '天外天',
    18,
    7,
    5,
    'cloud',
    '穿过天幕,方知天外有天',
    ['e_outsider', 'e_voidfish'],
    'e_voidgod',
    ['general', 'sky'],
    'xingyun'
  ),
  r(
    'xianfu',
    '仙人遗府',
    19,
    8,
    5,
    'castle',
    '陨落仙人的洞府,仙光犹在',
    ['e_xiangui', 'e_shilin'],
    'e_fuling',
    ['general', 'sky', 'ruin'],
    'tianwaitian'
  ),
  r(
    'hongmeng',
    '鸿蒙裂隙',
    20,
    8,
    5,
    'sparkles',
    '天地未开时的裂隙,万物之始',
    ['e_hmbeast', 'e_chaosshadow'],
    'e_hmdemon',
    ['general', 'sky'],
    'xianfu'
  ),
  // ============ 仙界(21-25 层)============
  r(
    'yunhai',
    '云海仙门',
    21,
    9,
    5,
    'cloud',
    '云海尽头,一道仙门巍然矗立,过此门者方称仙人',
    ['e_imm_guard', 'e_imm_crane'],
    'e_imm_gate',
    ['general', 'sky', 'immortal'],
    'hongmeng'
  ),
  r(
    'yujing',
    '金阙玉京',
    22,
    10,
    5,
    'castle',
    '金阙千重,玉京巍峨,天兵列阵森然',
    ['e_imm_jade', 'e_imm_spear'],
    'e_imm_general',
    ['general', 'sky', 'immortal'],
    'yunhai'
  ),
  r(
    'yaochi',
    '瑶池仙苑',
    23,
    11,
    5,
    'leaf',
    '瑶池之畔仙桃垂枝,守苑仙兽蛰伏于花影之间',
    ['e_imm_fairy', 'e_imm_beast'],
    'e_imm_queen',
    ['general', 'immortal'],
    'yujing'
  ),
  r(
    'leichi',
    '太乙雷池',
    24,
    12,
    5,
    'zap',
    '一池雷水亘古不涸,太乙仙光自池底冲天而起',
    ['e_tai_thunder', 'e_tai_light'],
    'e_tai_zun',
    ['general', 'thunder', 'immortal'],
    'yaochi'
  ),
  r(
    'daluotian',
    '大罗天阙',
    25,
    13,
    5,
    'star',
    '大罗天阙悬于星河之上,星君执掌周天星斗',
    ['e_luo_star', 'e_luo_void'],
    'e_luo_lord',
    ['general', 'sky', 'immortal'],
    'leichi'
  ),
  // ============ 神界(26-29 层)============
  r(
    'shenbian',
    '神域边陲',
    26,
    14,
    5,
    'shield',
    '神域边陲法则紊乱,斥候与凶兽游弋其间',
    ['e_god_scout', 'e_god_beast'],
    'e_god_border',
    ['general', 'god'],
    'daluotian'
  ),
  r(
    'shenbingguan',
    '神兵天关',
    27,
    15,
    5,
    'sword',
    '神兵列于天关,代天神将持戈而立',
    ['e_god_soldier', 'e_god_chariot'],
    'e_god_general',
    ['general', 'god'],
    'shenbian'
  ),
  r(
    'shenwangdian',
    '神王圣殿',
    28,
    16,
    5,
    'crown',
    '圣殿神光普照,神官诵念法则之名',
    ['e_god_priest', 'e_god_light'],
    'e_god_king',
    ['general', 'god'],
    'shenbingguan'
  ),
  r(
    'shendigong',
    '神帝天宫',
    29,
    17,
    5,
    'castle',
    '天宫之上,神帝垂目,法则化形为兽',
    ['e_god_guard', 'e_god_law'],
    'e_god_emperor',
    ['general', 'god'],
    'shenwangdian'
  ),
  // ============ 混沌海(30-32 层)============
  r(
    'hundunbin',
    '混沌之滨',
    30,
    18,
    5,
    'sparkles',
    '混沌之滨,天地未分,一点真灵游走其间',
    ['e_chaos_wisp', 'e_chaos_beast'],
    'e_chaos_lord',
    ['general', 'chaos'],
    'shendigong'
  ),
  r(
    'shenmoyuan',
    '神魔渊',
    31,
    19,
    5,
    'skull',
    '神魔一体,开天辟地的余威仍在此渊回荡',
    ['e_chaos_demon', 'e_chaos_void'],
    'e_chaos_king',
    ['general', 'chaos', 'dark'],
    'hundunbin'
  ),
  r(
    'hongmengbenyuan',
    '鸿蒙本源',
    32,
    20,
    5,
    'sparkles',
    '万道之源,鸿蒙本源静悬于此,道祖一念可开天地',
    ['e_chaos_origin', 'e_chaos_shadow'],
    'e_chaos_zu',
    ['general', 'chaos', 'sky'],
    'shenmoyuan'
  )
]

/** 人间界最高区域层级 —— 其上的层级属仙界/神界/混沌海,不进凡界路线池 */
export const MORTAL_TIER_MAX = 20

/** 凡界路线生成的素材池(只含人间界区域) */
export const MORTAL_REGIONS: RegionDef[] = REGIONS.filter(x => x.tier <= MORTAL_TIER_MAX)

const BY_ID = new Map(REGIONS.map(x => [x.id, x]))

export function regionDef(id: string): RegionDef | undefined {
  return BY_ID.get(id)
}

export const DANGER_NAMES = ['', '平缓', '寻常', '凶险', '大凶', '绝地'] as const
