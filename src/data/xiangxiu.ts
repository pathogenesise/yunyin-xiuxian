/**
 * 星象 —— 28 个星宿 · 四象 · 分野
 *
 * 二十八宿本是古人给黄道与赤道附近划的二十八个星区,分属四象(东苍龙、北玄武、
 * 西白虎、南朱雀),各宿又有分野之说 —— 以天上星区对应地上州域。
 *
 * 分野诸家小异(斗牛女三宿的归属尤甚),此处依《晋书·天文志》十二次分野。
 * 分野只作**来历**读:游戏里的地界不是九州,故不拿它当规则。
 *
 * 真正管用的一层在下面 MANIFEST_WORLDS:**游戏内以四象配四界**
 * (东→人间、南→仙、西→神、北→混沌)。这是游戏约定,不是古之分野 ——
 * 说清楚,免得把约定包装成典章。
 */
import type { WorldId } from '@/types'

export type ImageId = 'qinglong' | 'xuanwu' | 'baihu' | 'zhuque'

export interface ImageDef {
  id: ImageId
  /** 四象名 */
  name: string
  /** 方位 */
  direction: string
  /** 所配界域(游戏内约定) */
  world: WorldId
}

export const IMAGES: ImageDef[] = [
  { id: 'qinglong', name: '青龙', direction: '东', world: 'mortal' },
  { id: 'zhuque', name: '朱雀', direction: '南', world: 'immortal' },
  { id: 'baihu', name: '白虎', direction: '西', world: 'god' },
  { id: 'xuanwu', name: '玄武', direction: '北', world: 'chaos' }
]

export interface MansionDef {
  /** 宿名:角、亢、氐…… */
  name: string
  /** 全名:角木蛟、亢金龙…… */
  fullName: string
  image: ImageId
  /** 分野(所主之州;依《晋书·天文志》,诸家小异) */
  domain: string
  /** 所宜:此宿主何事 */
  good: string
}

/** 28 宿 —— 四象各七宿,依历代所传顺序 */
export const MANSIONS: MansionDef[] = [
  // 东方苍龙七宿
  { name: '角', fullName: '角木蛟', image: 'qinglong', domain: '兖州', good: '修造与开市,宜起手' },
  { name: '亢', fullName: '亢金龙', image: 'qinglong', domain: '兖州', good: '宜结契与立约' },
  { name: '氐', fullName: '氐土貉', image: 'qinglong', domain: '兖州', good: '宜安宅与定基' },
  { name: '房', fullName: '房日兔', image: 'qinglong', domain: '豫州', good: '宜与人同游' },
  { name: '心', fullName: '心月狐', image: 'qinglong', domain: '豫州', good: '宜静修与内观' },
  { name: '尾', fullName: '尾火虎', image: 'qinglong', domain: '幽州', good: '宜远行与追逐' },
  { name: '箕', fullName: '箕水豹', image: 'qinglong', domain: '幽州', good: '宜蓄养与积聚' },
  // 北方玄武七宿
  { name: '斗', fullName: '斗木獬', image: 'xuanwu', domain: '江湖', good: '宜决断与执事' },
  { name: '牛', fullName: '牛金牛', image: 'xuanwu', domain: '扬州', good: '宜耕耘与实干' },
  { name: '女', fullName: '女土蝠', image: 'xuanwu', domain: '扬州', good: '宜织造与巧作' },
  { name: '虚', fullName: '虚日鼠', image: 'xuanwu', domain: '青州', good: '宜守静与避事' },
  { name: '危', fullName: '危月燕', image: 'xuanwu', domain: '青州', good: '宜涉险与探幽' },
  { name: '室', fullName: '室火猪', image: 'xuanwu', domain: '并州', good: '宜营造与经营' },
  { name: '壁', fullName: '壁水貐', image: 'xuanwu', domain: '并州', good: '宜藏书与研读' },
  // 西方白虎七宿
  { name: '奎', fullName: '奎木狼', image: 'baihu', domain: '徐州', good: '宜文事与记述' },
  { name: '娄', fullName: '娄金狗', image: 'baihu', domain: '徐州', good: '宜聚众与设宴' },
  { name: '胃', fullName: '胃土雉', image: 'baihu', domain: '徐州', good: '宜囤积与备荒' },
  { name: '昴', fullName: '昴日鸡', image: 'baihu', domain: '冀州', good: '宜晨起与先行' },
  { name: '毕', fullName: '毕月乌', image: 'baihu', domain: '冀州', good: '宜收束与了结' },
  { name: '觜', fullName: '觜火猴', image: 'baihu', domain: '益州', good: '宜精工与细作' },
  { name: '参', fullName: '参水猿', image: 'baihu', domain: '益州', good: '宜用兵与争锋' },
  // 南方朱雀七宿
  { name: '井', fullName: '井木犴', image: 'zhuque', domain: '雍州', good: '宜定法与立制' },
  { name: '鬼', fullName: '鬼金羊', image: 'zhuque', domain: '雍州', good: '宜祭祀与慎终' },
  { name: '柳', fullName: '柳土獐', image: 'zhuque', domain: '三河', good: '宜调和与解纷' },
  { name: '星', fullName: '星日马', image: 'zhuque', domain: '三河', good: '宜疾行与捷径' },
  { name: '张', fullName: '张月鹿', image: 'zhuque', domain: '三河', good: '宜张扬与示人' },
  { name: '翼', fullName: '翼火蛇', image: 'zhuque', domain: '荆州', good: '宜远举与飞升' },
  { name: '轸', fullName: '轸水蚓', image: 'zhuque', domain: '荆州', good: '宜息事与收尾' }
]

const IMAGE_BY_ID = new Map(IMAGES.map(i => [i.id, i]))
export function imageDef(id: ImageId): ImageDef | undefined {
  return IMAGE_BY_ID.get(id)
}
