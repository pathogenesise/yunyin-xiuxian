/** 随机道号生成 */
import { RandomService } from '@/utils/random'

const SURNAMES = ['云', '风', '叶', '苏', '洛', '沈', '顾', '陆', '秦', '楚', '萧', '陵', '白', '墨', '凌', '江']
const GIVEN = ['尘', '青', '霜', '砚', '临渊', '疏影', '照夜', '归鸿', '扶摇', '听雪', '孤鹤', '无咎', '知非', '守拙', '望舒', '惊鸿']

export function randomDaoName(rng: RandomService): string {
  return rng.pick(SURNAMES) + rng.pick(GIVEN)
}
