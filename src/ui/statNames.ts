/** 属性中文名映射(展示层共用) */
import { formatPercent } from '@/utils/format'
import type { AffixRarity, AnyStatKey, StatMods } from '@/types'

/**
 * 词条稀有度的名目与颜色(展示层)。
 *
 * 稀有度此前只在数据里参与加权抽取,界面上从没露过面;现在装备卡片按它排序上色,
 * 玩家才看得出「这一条是撞上的大运」还是「这条是搭头」。名目沿用本作的四档叫法。
 */
export const AFFIX_RARITY_META: Record<AffixRarity, { name: string; color: string }> = {
  common: { name: '常见', color: 'var(--color-ink-faint)' },
  rare: { name: '稀有', color: 'var(--color-azure)' },
  epic: { name: '珍稀', color: 'var(--color-violet-ink)' },
  legendary: { name: '传世', color: 'var(--color-gold-ink)' }
}

export const STAT_NAMES: Record<AnyStatKey, string> = {
  attackPct: '攻击',
  defensePct: '防御',
  maxHpPct: '生命上限',
  critRate: '暴击率',
  critDamage: '暴击伤害',
  /**
   * 先手判定(speed)——这个名字必须与机制同形。
   *
   * 它是一条**阈值**:1 + 本项修正 ≥ 对手速度即抢先(见 core/combat.ts)。
   * 从前叫「出手速度」,读起来像连续收益,于是「+6% 为什么还是后手」成了必然的困惑。
   */
  speed: '先手判定',
  damageBonus: '伤害增幅',
  damageReduction: '伤害减免',
  cultivationSpeed: '修炼速度',
  qiRegen: '灵气恢复',
  /**
   * 「进阶成功率」——**不是**大关成功率。
   *
   * 它只进 `breakthroughInfo` 的那一次掷点:每大境 9 次小进阶(一世约 180 次)。
   * 大关(筑基起,含三个跨界入口)一律走天劫的逐波推演,压根不掷这个骰子
   * (见 core/breakthrough 的 attemptBreakthrough 与 tribulationDecision)。
   * 所以这条作用域是**恰好等于**小进阶的 —— 没有例外,不必带星号。
   *
   * 从前这里叫「突破成功率」,读起来像"万事皆管":玩家把「天命」「破境」堆满再
   * 去渡大关,发现一点用没有 —— 那是名字在过度承诺,不是数值失效。
   */
  breakthroughRate: '进阶成功率',
  /**
   * Equipment quality weights (equipGen) and 5% of this value folded into
   * the minor-step rate (breakthroughInfo). It does not raise event odds.
   */
  luck: '气运',
  /**
   * Divides EXPLORE_BATTLE_INTERVAL. Trip length is modeDef.durationSec
   * (and pet exploreDurMult). Calling it 「历练速度」looks like a shorter walk.
   */
  explorationSpeed: '历练遇敌',
  lifespanPct: '寿元上限',
  /**
   * loot.ts / offline explore only scale battle stone. Cave yield, events,
   * salvage, and suppress ticks ignore this key.
   */
  spiritStoneGain: '战利灵石',
  /**
   * loot.ts / offline.ts only multiply EQUIP_DROP_CHANCE.
   * Stone, herb, ore, pages, and pills ignore this key — calling it
   * 「掉落率」makes a title or weather day look like every bag fill.
   */
  dropRate: '装备掉落率',
  expGain: '战斗修为',
  /**
   * pillService adds this to craftability.bonusChance for a second pill,
   * then caps the roll at 0.8. It is not a 10% larger batch.
   */
  alchemyYield: '双枚成丹',
  /**
   * forge.equipUpgradeCost only. Artifact ritual, reforge, and crafting
   * ignore this key — 「炼器减耗」read like the whole forge table.
   */
  forgeDiscount: '强化减耗',
  qiCapPct: '灵气上限',
  beastPct: '灵兽效果',
  armorPen: '破甲',
  // 与 speed 分开命名:那个管「谁先出手」,这个管「首回合打得更重」(先发/雷霆词条)
  /**
   * Round-1 damage only (combat.ts factor on round === 1).
   * It does not move the speed threshold.
   */
  firstStrike: '首回合伤害',
  counterRate: '反击概率',
  lifesteal: '吸血',
  shieldOnStart: '开战护盾',
  executeDamage: '处决伤害',
  regenPerRound: '回合回复',
  dodgeRate: '闪避',
  accuracy: '命中',
  lowHpReduction: '濒危减伤',
  /**
   * Fail path only: shrinks BT_FAIL_EXP_LOSS. Qi is spent before the roll
   * and never comes back. The old name 「突破返还」read like a success rebate.
   */
  breakRefund: '失败返还修为',
  /**
   * loot.afterWin rolls this once: stone, battle exp, herb/ore count,
   * pages, extra equip tries. It is not "more item drops only".
   */
  doubleDropRate: '双倍战利',
  /**
   * Multiplies EXPLORE_EVENT_CHANCE in exploreEventChance.
   * Cave tours, bonds, and shop luck ignore this key.
   */
  eventLuck: '历练际遇',
  tribulationResist: '御劫',
  comboRate: '连击',
  stunRate: '震慑',
  lowHpDamage: '背水增伤',
  fullHpDamage: '锋芒增伤',
  shieldPower: '罡盾增伤',
  comboDamage: '追击威力',
  counterDamage: '反击威力',
  overhealShield: '溢疗成盾'
}

/**
 * 把一组词条摊成一行人话。
 *
 * 功法分支的词条既在择道界面出现,也在悟道录里出现 ——
 * 两处若各写一份格式化,措辞迟早分叉。
 */
/** Percent with an explicit sign. formatPercent already has a minus; do not prefix '+'. */
export function signedPercent(n: number): string {
  if (n < 0) return `-${formatPercent(Math.abs(n))}`
  return `+${formatPercent(n)}`
}

/**
 * Scope notes that belong on the number, not only in comments.
 * Titles, pills, weather, veins, and talent chips all read this map.
 */
export const STAT_CAVEATS: Partial<Record<AnyStatKey, string>> = {
  breakthroughRate: '小进阶;大关天劫不吃',
  luck: '主要抬装备成色;小进阶另吃此数的 5%',
  breakRefund: '失败掉的那份;不退灵气',
  alchemyYield: '多一枚的概率;与手艺合计顶 80%',
  explorationSpeed: '同程更多遭遇;不缩短行程',
  spiritStoneGain: '历练战胜所得;洞府产出不吃',
  forgeDiscount: '装备强化花费;法宝祭炼不吃',
  dropRate: '只抬装备出现;灵石草矿不吃',
  eventLuck: '只抬历练途中掷点;洞府巡游不吃',
  doubleDropRate: '当场灵石修为材料装备一并翻',
  expGain: '历练战胜所得;静修挂机不吃',
  tribulationResist: '天劫承伤;不改小进阶骰子',
  qiCapPct: '抬标称灵气上限;积余仓随之上浮',
  beastPct: '放大灵兽词条;不含灵兽园等级',
  speed: '1+此项≥对手速度才抢先',
  firstStrike: '只乘第一回合;不改谁先出手'
}

export function statCaveat(key: string): string | undefined {
  return STAT_CAVEATS[key as AnyStatKey]
}

export function statValueText(key: string, n: number): string {
  const caveat = statCaveat(key)
  return caveat ? `${signedPercent(n)}(${caveat})` : signedPercent(n)
}

export function statModPhrase(key: string, n: number): string {
  const name = STAT_NAMES[key as AnyStatKey] ?? key
  return `${name} ${statValueText(key, n)}`
}

export function modsText(mods: StatMods): string {
  return Object.entries(mods)
    .map(([k, v]) => statModPhrase(k, v as number))
    .join(' · ')
}
