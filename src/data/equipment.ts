/** 装备模板池 —— 50 件,按掉落层级逐步解锁 */
import type { EquipmentTemplate, EquipSlot, StatMods } from '@/types'

function t(
  id: string,
  name: string,
  slot: EquipSlot,
  minTier: number,
  base: EquipmentTemplate['base'],
  desc: string,
  opts: { icon?: string; fixedMods?: StatMods; set?: string } = {}
): EquipmentTemplate {
  const defaultIcon: Record<EquipSlot, string> = {
    weapon: 'sword',
    head: 'crown',
    body: 'shirt',
    wrist: 'watch',
    belt: 'link',
    boots: 'footprints',
    necklace: 'gem',
    ring: 'circle-dot',
    artifact: 'sparkles',
    talisman: 'scroll'
  }
  return { id, name, slot, minTier, base, desc, icon: opts.icon ?? defaultIcon[slot], fixedMods: opts.fixedMods, set: opts.set }
}

export const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  // ---- 武器(攻击为主) ----
  t('w_zhuqing', '青竹剑', 'weapon', 1, { attack: 10 }, '山后砍来的竹子削成,胜在趁手'),
  t('w_xuantie', '玄铁重剑', 'weapon', 2, { attack: 12 }, '玄铁铸就,大巧不工', { set: 's_tiebi' }),
  t('w_hanfeng', '寒锋剑', 'weapon', 4, { attack: 13, maxHp: 8 }, '剑出如霜,寒意逼人'),
  t('w_chiyan', '赤焰刀', 'weapon', 6, { attack: 14 }, '刀身暗藏地火,挥动时有焰纹流转', { icon: 'axe', fixedMods: { damageBonus: 0.04 } }),
  t('w_zidian', '紫电长枪', 'weapon', 9, { attack: 15 }, '枪出如龙,隐有雷鸣', { icon: 'wand', fixedMods: { speed: 0.05 } }),
  t('w_zhuxian', '诛仙剑胚', 'weapon', 12, { attack: 17 }, '上古凶剑残胚,杀意未散', { fixedMods: { critRate: 0.04 } }),
  t('w_shishen', '弑神戟', 'weapon', 15, { attack: 18, maxHp: 15 }, '传闻曾饮真仙之血', { icon: 'axe', fixedMods: { armorPen: 0.06 } }),
  t('w_hongmeng', '鸿蒙剑', 'weapon', 18, { attack: 20 }, '开天辟地之气所化,剑意通神', { fixedMods: { damageBonus: 0.1 } }),
  // ---- 头冠 ----
  t('h_muzan', '桃木簪', 'head', 1, { defense: 4, maxHp: 15 }, '一支素簪,聊胜于无'),
  t('h_xuantie', '玄铁冠', 'head', 4, { defense: 5, maxHp: 20 }, '沉重却牢靠', { set: 's_tiebi' }),
  t('h_xingchen', '星辰冠', 'head', 8, { defense: 6, maxHp: 24 }, '嵌有陨星碎屑,夜里微光流动', { fixedMods: { qiRegen: 0.06 }, set: 's_xingdou' }),
  t('h_zijin', '紫金冠', 'head', 12, { defense: 7, maxHp: 28 }, '紫金打造,气度不凡', { fixedMods: { cultivationSpeed: 0.04 } }),
  t('h_jiuxiao', '九霄冠', 'head', 16, { defense: 8, maxHp: 32 }, '戴之如临九霄,神思清明', { fixedMods: { breakthroughRate: 0.02 } }),
  // ---- 衣袍 ----
  t('b_mabu', '麻布道袍', 'body', 1, { defense: 7, maxHp: 30 }, '浆洗得发白的旧道袍'),
  t('b_qingyun', '青云道袍', 'body', 3, { defense: 8, maxHp: 36 }, '青云门制式道袍,冬暖夏凉'),
  t('b_xuanwu', '玄武甲', 'body', 6, { defense: 10, maxHp: 42 }, '仿玄武之甲铸成,厚重难破', { fixedMods: { damageReduction: 0.04 }, set: 's_tiebi' }),
  t('b_liuyun', '流云仙衣', 'body', 10, { defense: 11, maxHp: 48 }, '轻若流云,水火不侵', { fixedMods: { dodgeRate: 0.03 } }),
  t('b_xingluo', '星罗法衣', 'body', 14, { defense: 12, maxHp: 55 }, '衣上星图与周天同转', { fixedMods: { qiRegen: 0.08 }, set: 's_xingdou' }),
  t('b_hundun', '混沌天衣', 'body', 18, { defense: 14, maxHp: 62 }, '无形无相,劫火难焚', { fixedMods: { damageReduction: 0.08 } }),
  // ---- 护腕 ----
  t('wr_tengwen', '藤纹护腕', 'wrist', 1, { attack: 3, defense: 3 }, '古藤编织,韧性十足'),
  t('wr_tiebi', '铁臂缚', 'wrist', 5, { attack: 4, defense: 4 }, '缠臂如铁,出拳沉稳'),
  t('wr_longlin', '龙鳞腕甲', 'wrist', 10, { attack: 5, defense: 5 }, '嵌有蛟龙逆鳞', { fixedMods: { counterRate: 0.05 } }),
  t('wr_xianjin', '仙金护臂', 'wrist', 15, { attack: 6, defense: 6 }, '仙金流转,坚不可摧', { fixedMods: { attackPct: 0.05 } }),
  // ---- 腰带 ----
  t('bl_cubu', '粗布腰带', 'belt', 1, { defense: 3, maxHp: 25 }, '寻常布带,束衣而已'),
  t('bl_shoupi', '兽皮腰带', 'belt', 5, { defense: 4, maxHp: 32 }, '妖兽之皮鞣制,坚韧异常'),
  t('bl_mangwen', '蟒纹玉带', 'belt', 10, { defense: 5, maxHp: 40 }, '玉扣蟒纹,贵气内敛', { fixedMods: { maxHpPct: 0.05 } }),
  t('bl_qiankun', '乾坤绦', 'belt', 15, { defense: 6, maxHp: 46 }, '一绦系乾坤,万法不沾身', { fixedMods: { shieldOnStart: 0.06 } }),
  // ---- 鞋履 ----
  t('bo_caoxie', '芒鞋', 'boots', 1, { defense: 3, maxHp: 12 }, '踏遍青山人未老'),
  t('bo_kuaixue', '快靴', 'boots', 4, { defense: 4, maxHp: 15 }, '轻便利落,健步如飞', { fixedMods: { speed: 0.03 } }),
  t('bo_tayun', '踏云靴', 'boots', 8, { defense: 5, maxHp: 18 }, '足下生云,身轻如燕', { fixedMods: { explorationSpeed: 0.06 } }),
  t('bo_zhuixing', '追星履', 'boots', 12, { defense: 6, maxHp: 22 }, '一步百丈,可追流星', { fixedMods: { speed: 0.06 } }),
  t('bo_xukong', '虚空步靴', 'boots', 16, { defense: 7, maxHp: 26 }, '踏虚空如平地', { fixedMods: { dodgeRate: 0.05 } }),
  // ---- 项链 ----
  t('n_muzhu', '木珠串', 'necklace', 1, { maxHp: 20 }, '老山木所制念珠,凝神静气'),
  t('n_lingyu', '灵玉坠', 'necklace', 4, { maxHp: 26 }, '温润灵玉,滋养经脉', { fixedMods: { qiRegen: 0.05 } }),
  t('n_xingsui', '星髓链', 'necklace', 8, { maxHp: 32 }, '星髓凝成,引星力入体', { fixedMods: { cultivationSpeed: 0.05 } }),
  t('n_longhun', '龙魂坠', 'necklace', 12, { maxHp: 38, attack: 3 }, '封存着一缕龙魂', { fixedMods: { attackPct: 0.04 } }),
  t('n_hunyuan', '混元珠链', 'necklace', 16, { maxHp: 45 }, '一珠一世界,混元护周身', { fixedMods: { damageReduction: 0.05 } }),
  // ---- 戒指 ----
  t('r_tongjie', '铜戒', 'ring', 1, { attack: 3 }, '不起眼的铜戒指'),
  t('r_xuanguang', '玄光戒', 'ring', 4, { attack: 4 }, '内蕴玄光,可聚灵机', { fixedMods: { luck: 0.02 } }),
  t('r_juling', '聚灵戒', 'ring', 7, { attack: 4, maxHp: 15 }, '聚灵成环,佩之修行事半功倍', { fixedMods: { cultivationSpeed: 0.04 } }),
  t('r_zixia', '紫霞戒', 'ring', 10, { attack: 5 }, '紫霞萦绕,暗藏杀机', { fixedMods: { critRate: 0.03 } }),
  t('r_qianji', '千机戒', 'ring', 14, { attack: 6, defense: 3 }, '千机暗藏,变化无穷', { fixedMods: { dropRate: 0.06 } }),
  t('r_daozu', '道祖戒', 'ring', 18, { attack: 7, maxHp: 20 }, '相传为道祖随手所铸', { fixedMods: { breakthroughRate: 0.03 } }),
  // ---- 灵符 ----
  t('tl_pingan', '平安符', 'talisman', 1, { maxHp: 15 }, '山下道观求来的平安符'),
  t('tl_juqi', '聚气符', 'talisman', 3, { maxHp: 18 }, '符成引气,昼夜不息', { fixedMods: { qiRegen: 0.08 } }),
  t('tl_hushen', '护身符', 'talisman', 6, { maxHp: 22, defense: 3 }, '危难时可挡一击', { fixedMods: { shieldOnStart: 0.05 } }),
  t('tl_wulei', '五雷符', 'talisman', 9, { maxHp: 25, attack: 3 }, '五雷正法,鬼魅辟易', { fixedMods: { damageBonus: 0.05 } }),
  t('tl_jinguang', '金光符', 'talisman', 12, { maxHp: 30 }, '金光护体,万邪不侵', { fixedMods: { damageReduction: 0.05 } }),
  t('tl_taiyi', '太乙符', 'talisman', 15, { maxHp: 35 }, '太乙救苦,起死回生', { fixedMods: { regenPerRound: 0.015 } }),
  t('tl_dadao', '大道符', 'talisman', 18, { maxHp: 40 }, '符纹即道纹,观之可悟道', { fixedMods: { cultivationSpeed: 0.08 } }),

  // ============ 仙界(tier 21-25)============
  // 各部位各一件,minTier 取本界中段——生成器按「最接近当前层级」取样,
  // 于是仙人掉落的东西,从此有自己的名目,而不是把人间界的顶配一路带上天。
  // 平铺基数刻意与人间界顶配(鸿蒙剑/混沌天衣等)对齐:高界装备给的是名目与机制,
  // 不是同一层级下白送的一档数值——否则战力来源会悄悄从「境界+构筑」滑回「刷装备」
  t('w_xianjun', '仙钧剑', 'weapon', 23, { attack: 20 }, '仙钧之气所铸,一剑分阴阳', { fixedMods: { damageBonus: 0.1 }, set: 's_xianjia' }),
  t('h_yuxu', '御虚冠', 'head', 23, { defense: 8, maxHp: 32 }, '冠上虚影流转,神念出窍亦不迷', { fixedMods: { cultivationSpeed: 0.06 }, set: 's_xianjia' }),
  t('b_yunjin', '云锦仙袍', 'body', 23, { defense: 14, maxHp: 62 }, '云锦织就,风过不沾尘', { fixedMods: { dodgeRate: 0.04 }, set: 's_xianjia' }),
  t('wr_xianlin', '仙鳞腕甲', 'wrist', 23, { attack: 6, defense: 6 }, '应龙脱鳞所制,坚而有灵', { fixedMods: { attackPct: 0.05 } }),
  t('bl_suiyu', '碎玉仙绦', 'belt', 23, { defense: 6, maxHp: 46 }, '万千仙玉碎而复合,束之如渊', { fixedMods: { maxHpPct: 0.06 } }),
  t('bt_xianyun', '踏云履', 'boots', 23, { defense: 7, maxHp: 26 }, '足不沾地,行于云上', { fixedMods: { explorationSpeed: 0.12 } }),
  t('n_xingmang', '星芒仙坠', 'necklace', 23, { maxHp: 45 }, '一颗小星坠在颈间,夜夜微光', { fixedMods: { qiRegen: 0.1 } }),
  t('r_xianji', '仙机戒', 'ring', 23, { attack: 7, maxHp: 20 }, '仙机流转,掐指知凶吉', { fixedMods: { luck: 0.06 } }),
  t('tl_xianzhuan', '仙篆', 'talisman', 23, { maxHp: 40 }, '一枚古仙篆,朱砂至今未褪', { fixedMods: { breakthroughRate: 0.03 } }),

  // ============ 神界(tier 26-29)============
  t('w_shenge', '神戈', 'weapon', 28, { attack: 20 }, '神戈所指,众神俯首', { fixedMods: { armorPen: 0.1 }, set: 's_shenjia' }),
  t('h_shenmian', '神冕', 'head', 28, { defense: 8, maxHp: 32 }, '神冕加身,言出法随', { fixedMods: { damageReduction: 0.05 }, set: 's_shenjia' }),
  t('b_shenkai', '神铠', 'body', 28, { defense: 14, maxHp: 62 }, '神金锻造,神域之火亦不能熔', { fixedMods: { damageReduction: 0.08 }, set: 's_shenjia' }),
  t('wr_shenbi', '神臂环', 'wrist', 28, { attack: 6, defense: 6 }, '神环缠臂,举手有千钧之力', { fixedMods: { counterRate: 0.08 } }),
  t('bl_faze', '法则带', 'belt', 28, { defense: 6, maxHp: 46 }, '一条法则凝成的带,系则不坠', { fixedMods: { shieldOnStart: 0.1 } }),
  t('bt_shenxing', '神行靴', 'boots', 28, { defense: 7, maxHp: 26 }, '踏地生雷,万里一瞬', { fixedMods: { speed: 0.08 } }),
  t('n_shenxin', '神心坠', 'necklace', 28, { maxHp: 45 }, '一神陨落之心,至今犹温', { fixedMods: { maxHpPct: 0.08 } }),
  t('r_shenquan', '神权戒', 'ring', 28, { attack: 7, maxHp: 20 }, '戴上它,你便握有一分神权', { fixedMods: { attackPct: 0.06 } }),
  t('tl_shenzhao', '神诏', 'talisman', 28, { maxHp: 40 }, '一纸神诏,天地共遵', { fixedMods: { breakthroughRate: 0.035 } }),

  // ============ 混沌海(tier 30-32)============
  t('w_kaifu', '开天斧', 'weapon', 31, { attack: 20 }, '开天辟地的那一柄,余威万古不散', { fixedMods: { damageBonus: 0.12 }, set: 's_hundunjia' }),
  t('h_hundunguan', '混沌冠', 'head', 31, { defense: 8, maxHp: 32 }, '冠中浑沌未分,一念可开', { fixedMods: { cultivationSpeed: 0.08 }, set: 's_hundunjia' }),
  t('b_hundunyi', '混沌玄衣', 'body', 31, { defense: 14, maxHp: 62 }, '玄衣如虚,刀兵加身如入无物', { fixedMods: { damageReduction: 0.1 }, set: 's_hundunjia' }),
  t('wr_hundunhuan', '混沌环', 'wrist', 31, { attack: 6, defense: 6 }, '环内自成一界,盈虚不定', { fixedMods: { attackPct: 0.06 } }),
  t('bl_daoyun', '道韵绦', 'belt', 31, { defense: 6, maxHp: 46 }, '一绦道韵,系住将散的本源', { fixedMods: { maxHpPct: 0.09 } }),
  t('bt_wuji', '无极履', 'boots', 31, { defense: 7, maxHp: 26 }, '履下无路,却处处是路', { fixedMods: { dodgeRate: 0.06 } }),
  t('n_benyuan', '本源坠', 'necklace', 31, { maxHp: 45 }, '一滴本源凝成的坠,望之如望万界之初', { fixedMods: { qiRegen: 0.14 } }),
  t('r_hundun', '混沌戒', 'ring', 31, { attack: 7, maxHp: 20 }, '戒指内里,是一方尚未演化的天地', { fixedMods: { luck: 0.08 } }),
  t('tl_daowen', '道文符', 'talisman', 31, { maxHp: 40 }, '符上是比道更早的那一笔', { fixedMods: { cultivationSpeed: 0.1 } })
]

const BY_ID = new Map(EQUIPMENT_TEMPLATES.map(x => [x.id, x]))

export function equipmentTemplate(id: string): EquipmentTemplate | undefined {
  return BY_ID.get(id)
}

export const EQUIP_SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '武器',
  head: '头冠',
  body: '衣袍',
  wrist: '护腕',
  belt: '腰带',
  boots: '鞋履',
  necklace: '项链',
  ring: '戒指',
  artifact: '法宝',
  talisman: '灵符'
}
