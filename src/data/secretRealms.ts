/**
 * 短期秘境 —— 一次性内容:进入一次、规则随机、结束后消失,不污染大地图。
 *
 * 结构:进入(付入口代价)→ 随机规则 1~2 条 → 三层 → 最终宝藏。
 *
 * **规则必须是能生效的规则**:Phase 31 留下的那版规则是一串纯文本
 * (「灵力枯竭(每战首回合无灵气加成)」之类),引擎里没有对应通道 ——
 * 写了也白写。此处每条规则都带一组既有的 CombatRules,文本只是它的说法。
 * 凡是既有规则表达不出来的,不进这个池子。
 */
import type { CombatRules } from '@/types'

/** 秘境层数:固定三层(放数据里,player.sanitize 读档修形也要用它,免得反手 import core) */
export const SECRET_LAYERS = 3
/** 败两次即被逐出 */
export const SECRET_MAX_LOSSES = 2

export interface SecretRule {
  /** 给玩家看的说法 */
  text: string
  /** 真正并入战斗的规则 */
  rules: CombatRules
}

/** 随机规则池 —— 每条都能落到既有的 CombatRules 上 */
export const SECRET_RULES: SecretRule[] = [
  { text: '治疗减半', rules: { healMult: 0.5 } },
  { text: '敌方多一段追击', rules: { enemyExtraMods: { counterRate: 0.15 } } },
  { text: '回合上限 20', rules: { maxRounds: 20 } },
  { text: '妖兽狂化(攻击 +20%)', rules: { enemyAtkMult: 1.2 } },
  { text: '不得使用护盾', rules: { shieldCapRatio: 0 } },
  { text: '妖血更厚(气血 +25%)', rules: { enemyHpMult: 1.25 } },
  { text: '此地凶险(敌方攻防各 +10%)', rules: { enemyAtkMult: 1.1, enemyExtraMods: { defensePct: 0.1 } } }
]

export interface SecretRealmDef {
  id: string
  name: string
  desc: string
  /** 可进入的最低大境界(元婴 = 3 起) */
  minMajor: number
  /** 入口代价:灵石,按玩家当前地界层级折算 */
  entryStone: number
  /** 本境自带的规则(进入即生效,与随机规则叠加) */
  rules: CombatRules
  /** 层间回血比例(负数为损血) */
  healBetweenPct: number
  /** 战利倍率 */
  rewardMult: number
}

/**
 * 固定三处秘境 —— 门槛与代价都写在这张表上,改口径只改这里。
 *
 * ⚠ 入口经济:Phase 31 原稿把它们定在「元婴门槛 + 道源代价」上,而道源是
 * 真仙之后才有的资源 —— 元婴玩家付不出,等于进不去(见 RIL TASK-031/DEC-014)。
 * 现按既定的 minMajor(=3)取灵石代价,使其在门槛境界就能真的走进去;
 * 若日后要改成「真仙终局版」,把 minMajor 改 9、把 entryStone 换成道源代价即可,
 * 玩法循环一行不用动。
 */
export const SECRET_REALMS: SecretRealmDef[] = [
  {
    id: 'sr_kurong',
    name: '枯荣古境',
    desc: '草木枯而复荣。治疗极盛,但每层之末要留一成气血给这片土地。',
    minMajor: 3,
    entryStone: 40,
    rules: { healMult: 2 },
    healBetweenPct: -0.1,
    rewardMult: 1.2
  },
  {
    id: 'sr_jianzhong',
    name: '剑冢幻境',
    desc: '万剑横空。出手极重,防守极薄。',
    minMajor: 3,
    entryStone: 60,
    rules: { playerAtkMult: 1.3, playerExtraMods: { defensePct: -0.2 } },
    healBetweenPct: 0.5,
    rewardMult: 1.3
  },
  {
    id: 'sr_kuye',
    name: '苦海渡舟',
    desc: '一叶渡苦海。回气极慢,但彼岸的东西格外丰厚。',
    minMajor: 4,
    entryStone: 80,
    rules: {},
    healBetweenPct: 0.3,
    rewardMult: 1.5
  }
]

const BY_ID = new Map(SECRET_REALMS.map(r => [r.id, r]))

export function secretRealmDef(id: string): SecretRealmDef | undefined {
  return BY_ID.get(id)
}
