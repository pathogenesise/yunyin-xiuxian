/** 功法库 —— 主修 12 / 辅修 13 / 秘术 8 */
import type { GongfaDef, GongfaType, QualityId, StatMods } from '@/types'

function g(
  id: string,
  name: string,
  type: GongfaType,
  quality: QualityId,
  minRealm: number,
  desc: string,
  baseMods: StatMods,
  perLevelMods: StatMods,
  opts: { element?: GongfaDef['element']; maxLevel?: number; skill?: GongfaDef['skill'] } = {}
): GongfaDef {
  return {
    id,
    name,
    type,
    quality,
    minRealm,
    desc,
    baseMods,
    perLevelMods,
    maxLevel: opts.maxLevel ?? (type === 'secret' ? 3 : 9),
    element: opts.element,
    skill: opts.skill
  }
}

export const GONGFA: GongfaDef[] = [
  // ---- 主修功法 ----
  g(
    'm_taixuan',
    '太玄引气诀',
    'main',
    'mortal',
    0,
    '大道至简的入门功法,胜在中正平和',
    { cultivationSpeed: 0.1 },
    { cultivationSpeed: 0.02 },
    { skill: { name: '太玄一气', mult: 1.5, rate: 0.2 } }
  ),
  g(
    'm_qingmu',
    '青木长生功',
    'main',
    'fine',
    0,
    '取青木生生不息之意,养身养气',
    { cultivationSpeed: 0.12, maxHpPct: 0.06 },
    { cultivationSpeed: 0.02, maxHpPct: 0.01 },
    { element: 'wood', skill: { name: '木灵缠绕', mult: 1.4, rate: 0.2 } }
  ),
  g(
    'm_lihuo',
    '离火焚天诀',
    'main',
    'fine',
    0,
    '心火即离火,一念可焚天',
    { cultivationSpeed: 0.1, attackPct: 0.08 },
    { cultivationSpeed: 0.02, attackPct: 0.012 },
    { element: 'fire', skill: { name: '焚天火', mult: 1.7, rate: 0.22 } }
  ),
  g(
    'm_xuanshui',
    '玄水凝真经',
    'main',
    'fine',
    0,
    '上善若水,以柔克刚',
    { cultivationSpeed: 0.1, defensePct: 0.08, qiRegen: 0.08 },
    { cultivationSpeed: 0.02, defensePct: 0.012 },
    { element: 'water', skill: { name: '寒潮', mult: 1.5, rate: 0.2 } }
  ),
  g(
    'm_gengjin',
    '庚金剑典',
    'main',
    'excellent',
    1,
    '庚金主杀伐,剑修之上选',
    { cultivationSpeed: 0.14, attackPct: 0.12, critRate: 0.02 },
    { cultivationSpeed: 0.02, attackPct: 0.015 },
    { element: 'metal', skill: { name: '庚金剑气', mult: 1.9, rate: 0.25 } }
  ),
  g(
    'm_houtu',
    '厚土不动明王功',
    'main',
    'excellent',
    1,
    '不动如山,万法难侵',
    { cultivationSpeed: 0.12, defensePct: 0.14, maxHpPct: 0.1 },
    { cultivationSpeed: 0.02, defensePct: 0.015, maxHpPct: 0.012 },
    { element: 'earth', skill: { name: '山岳压顶', mult: 1.6, rate: 0.22 } }
  ),
  g(
    'm_zixiao',
    '紫霄神雷诀',
    'main',
    'spirit',
    2,
    '引九天神雷淬体炼魂',
    { cultivationSpeed: 0.18, attackPct: 0.14, speed: 0.05 },
    { cultivationSpeed: 0.025, attackPct: 0.018 },
    { element: 'thunder', skill: { name: '紫霄神雷', mult: 2.2, rate: 0.25 } }
  ),
  g(
    'm_gangfeng',
    '罡风渡虚法',
    'main',
    'spirit',
    2,
    '身化罡风,来去无踪',
    { cultivationSpeed: 0.16, dodgeRate: 0.04, explorationSpeed: 0.1 },
    { cultivationSpeed: 0.025, dodgeRate: 0.005 },
    { element: 'wind', skill: { name: '风刃千重', mult: 1.9, rate: 0.28 } }
  ),
  g(
    'm_xuanbing',
    '玄冰道典',
    'main',
    'spirit',
    3,
    '心如玄冰,道心通明',
    { cultivationSpeed: 0.18, defensePct: 0.12, damageReduction: 0.04 },
    { cultivationSpeed: 0.025, defensePct: 0.015 },
    { element: 'ice', skill: { name: '冰封千里', mult: 2.0, rate: 0.24 } }
  ),
  g(
    'm_guangming',
    '大光明普照经',
    'main',
    'profound',
    4,
    '光明所照,诸邪辟易',
    { cultivationSpeed: 0.22, maxHpPct: 0.16, breakthroughRate: 0.02 },
    { cultivationSpeed: 0.03, maxHpPct: 0.02 },
    { element: 'light', skill: { name: '大光明拳', mult: 2.3, rate: 0.25 } }
  ),
  g(
    'm_youming',
    '幽冥噬魂录',
    'main',
    'profound',
    4,
    '噬魂夺魄,亦正亦邪',
    { cultivationSpeed: 0.22, attackPct: 0.18, lifesteal: 0.03 },
    { cultivationSpeed: 0.03, attackPct: 0.02 },
    { element: 'dark', skill: { name: '噬魂', mult: 2.2, rate: 0.26 } }
  ),
  g(
    'm_hundun',
    '混沌一气功',
    'main',
    'heaven',
    6,
    '万法归一,一气化混沌',
    { cultivationSpeed: 0.3, attackPct: 0.12, defensePct: 0.12, maxHpPct: 0.12 },
    { cultivationSpeed: 0.04, attackPct: 0.015, defensePct: 0.015 },
    { element: 'chaos', skill: { name: '混沌一击', mult: 2.8, rate: 0.25 } }
  ),
  // ---- 辅修功法 ----
  g('s_tuna', '龟灵吐纳术', 'sub', 'mortal', 0, '一吐一纳,绵绵不绝', { cultivationSpeed: 0.06 }, { cultivationSpeed: 0.012 }),
  g(
    's_lianti',
    '百炼锻体术',
    'sub',
    'mortal',
    0,
    '肉身为炉,千锤百炼',
    { maxHpPct: 0.08, defensePct: 0.04 },
    { maxHpPct: 0.012, defensePct: 0.008 }
  ),
  g(
    's_yufeng',
    '御风步',
    'sub',
    'fine',
    0,
    '踏风而行,身轻如燕',
    { speed: 0.05, explorationSpeed: 0.06 },
    { speed: 0.008, explorationSpeed: 0.01 }
  ),
  g('s_lianxi', '敛息诀', 'sub', 'fine', 1, '敛尽气机,祸事不近身', { dodgeRate: 0.03, luck: 0.03 }, { dodgeRate: 0.004, luck: 0.005 }),
  g('s_juling', '聚灵阵法初解', 'sub', 'fine', 1, '布下小型聚灵阵辅助修行', { qiRegen: 0.12 }, { qiRegen: 0.02 }),
  g(
    's_mingxin',
    '明心见性篇',
    'sub',
    'excellent',
    1,
    '观己心,见本性',
    { expGain: 0.08, breakthroughRate: 0.01 },
    { expGain: 0.015, breakthroughRate: 0.002 }
  ),
  g(
    's_tiegu',
    '铁骨铮铮功',
    'sub',
    'excellent',
    2,
    '骨如玄铁,宁折不弯',
    { defensePct: 0.1, damageReduction: 0.03 },
    { defensePct: 0.015, damageReduction: 0.005 }
  ),
  g(
    's_lingxi',
    '灵犀一指',
    'sub',
    'excellent',
    2,
    '指出灵犀,直指要害',
    { critRate: 0.03, critDamage: 0.1 },
    { critRate: 0.004, critDamage: 0.02 }
  ),
  g(
    's_dianshi',
    '点石成金术',
    'sub',
    'spirit',
    3,
    '沙里淘金,点石成宝',
    { spiritStoneGain: 0.15, dropRate: 0.06 },
    { spiritStoneGain: 0.025, dropRate: 0.01 }
  ),
  g(
    's_guixi',
    '龟息养寿功',
    'sub',
    'spirit',
    3,
    '息心止念,寿与天齐',
    { lifespanPct: 0.06, maxHpPct: 0.08 },
    { lifespanPct: 0.012, maxHpPct: 0.012 }
  ),
  g(
    's_zhoutian',
    '周天星辰图',
    'sub',
    'profound',
    5,
    '以身为宇,以窍为星',
    { cultivationSpeed: 0.12, qiRegen: 0.1 },
    { cultivationSpeed: 0.02, qiRegen: 0.02 }
  ),
  g(
    's_wanjian',
    '万剑归宗图',
    'sub',
    'profound',
    5,
    '万剑朝宗,杀伐无双',
    { attackPct: 0.15, comboRate: 0.04 },
    { attackPct: 0.02, comboRate: 0.006 }
  ),
  g(
    's_budong',
    '不动如山章',
    'sub',
    'excellent',
    1,
    '身如山岳,盾罡不息',
    { shieldOnStart: 0.06, shieldPower: 0.08 },
    { shieldOnStart: 0.01, shieldPower: 0.015 }
  ),
  // ---- 秘术 ----
  g('x_tianyan', '天眼通', 'secret', 'excellent', 2, '开天眼,窥机缘', { luck: 0.06, eventLuck: 0.08 }, { luck: 0.02, eventLuck: 0.03 }),
  g(
    'x_jingang',
    '金刚不坏身',
    'secret',
    'spirit',
    3,
    '法身金刚,不坏不灭',
    { damageReduction: 0.08, lowHpReduction: 0.15 },
    { damageReduction: 0.02, lowHpReduction: 0.05 }
  ),
  g(
    'x_jianxin',
    '剑心通明',
    'secret',
    'spirit',
    3,
    '剑心澄澈,料敌先机',
    { critRate: 0.05, critDamage: 0.2 },
    { critRate: 0.01, critDamage: 0.06 }
  ),
  g(
    'x_xiangsi',
    '向死而生诀',
    'secret',
    'spirit',
    2,
    '置之死地,而后方生',
    { lowHpDamage: 0.2, lowHpReduction: 0.1 },
    { lowHpDamage: 0.06, lowHpReduction: 0.03 }
  ),
  g(
    'x_fanzhen',
    '天罡反震诀',
    'secret',
    'spirit',
    3,
    '以彼之力,还施彼身',
    { counterRate: 0.08, counterDamage: 0.25 },
    { counterRate: 0.02, counterDamage: 0.08 }
  ),
  g('x_sanqing', '一气化三清', 'secret', 'profound', 5, '一气化三,修行三倍', { cultivationSpeed: 0.2 }, { cultivationSpeed: 0.06 }),
  g(
    'x_woxuan',
    '斡旋造化',
    'secret',
    'heaven',
    6,
    '窃天地造化为己用',
    { breakthroughRate: 0.04, breakRefund: 0.1 },
    { breakthroughRate: 0.01, breakRefund: 0.04 }
  ),
  g(
    'x_nitian',
    '逆天改命经',
    'secret',
    'immortal',
    7,
    '我命由我不由天',
    { luck: 0.1, breakthroughRate: 0.05, lifespanPct: 0.1 },
    { luck: 0.03, breakthroughRate: 0.012, lifespanPct: 0.03 }
  )
]

const BY_ID = new Map(GONGFA.map(x => [x.id, x]))

export function gongfaDef(id: string): GongfaDef | undefined {
  return BY_ID.get(id)
}

export const GONGFA_TYPE_NAMES: Record<GongfaType, string> = {
  main: '主修',
  sub: '辅修',
  secret: '秘术'
}
