/** 主线任务链与每日任务 */
import type { QuestDef } from '@/types'

/** 主线任务:按顺序逐个推进,自动完成自动发奖 */
export const MAIN_QUESTS: QuestDef[] = [
  {
    id: 'q_start',
    name: '踏上仙途',
    desc: '突破至炼气三层',
    cond: { type: 'custom', key: 'realm_0_2' },
    reward: { stoneTier: 15, herb: 10 }
  },
  {
    id: 'q_explore',
    name: '初出茅庐',
    desc: '完成一次历练',
    cond: { type: 'counter', key: 'explores', value: 1 },
    reward: { stoneTier: 20, page: 6 }
  },
  {
    id: 'q_kill10',
    name: '斩妖除魔',
    desc: '击败 10 个敌人',
    cond: { type: 'counter', key: 'kills', value: 10 },
    reward: { stoneTier: 25, dust: 8 }
  },
  {
    id: 'q_equip',
    name: '披挂上阵',
    desc: '获得 5 件装备',
    cond: { type: 'counter', key: 'equipsGained', value: 5 },
    reward: { stoneTier: 25, dust: 10 }
  },
  {
    id: 'q_lianqi9',
    name: '炼气圆满',
    desc: '修至炼气圆满',
    cond: { type: 'custom', key: 'realm_0_9' },
    reward: { stoneTier: 40, herb: 20 }
  },
  { id: 'q_zhuji', name: '筑基问道', desc: '突破至筑基境', cond: { type: 'realm', major: 1 }, reward: { stoneTier: 60, wudao: 10 } },
  {
    id: 'q_gongfa',
    name: '博览道藏',
    desc: '习得 3 部功法',
    cond: { type: 'counter', key: 'gongfaLearned', value: 3 },
    reward: { page: 20, wudao: 8 }
  },
  {
    id: 'q_building',
    name: '经营洞府',
    desc: '累计升级建筑 5 次',
    cond: { type: 'counter', key: 'buildingUpgrades', value: 5 },
    reward: { stoneTier: 50, ore: 20 }
  },
  { id: 'q_pill', name: '丹道初窥', desc: '炼制 5 枚丹药', cond: { type: 'counter', key: 'pillsCrafted', value: 5 }, reward: { herb: 30 } },
  {
    id: 'q_boss3',
    name: '扫荡群妖',
    desc: '击败 3 位区域首领',
    cond: { type: 'counter', key: 'bossKills', value: 3 },
    reward: { stoneTier: 80, wudao: 15 }
  },
  { id: 'q_jindan', name: '金丹大道', desc: '突破至金丹境', cond: { type: 'realm', major: 2 }, reward: { stoneTier: 100, wudao: 25 } },
  {
    id: 'q_upgrade20',
    name: '千锤百炼',
    desc: '累计强化装备 20 次',
    cond: { type: 'counter', key: 'upgrades', value: 20 },
    reward: { dust: 40 }
  },
  { id: 'q_yuanying', name: '元婴之路', desc: '突破至元婴境', cond: { type: 'realm', major: 3 }, reward: { stoneTier: 150, wudao: 40 } },
  {
    id: 'q_boss10',
    name: '威震诸域',
    desc: '击败 10 位区域首领',
    cond: { type: 'counter', key: 'bossKills', value: 10 },
    reward: { stoneTier: 200, wudao: 50 }
  },
  { id: 'q_huashen', name: '问鼎化神', desc: '突破至化神境', cond: { type: 'realm', major: 4 }, reward: { stoneTier: 300, wudao: 80 } }
]

export interface DailyTaskDef {
  id: string
  name: string
  desc: string
  counterKey: 'kills' | 'pillsUsed' | 'explores' | 'breakthroughs'
  target: number
  reward: QuestDef['reward']
}

/** 每日任务:按当日计数器增量结算 */
export const DAILY_TASKS: DailyTaskDef[] = [
  { id: 'd_kill', name: '每日斩妖', desc: '今日击败 15 个敌人', counterKey: 'kills', target: 15, reward: { stoneTier: 20 } },
  { id: 'd_pill', name: '每日服药', desc: '今日服用 1 枚丹药', counterKey: 'pillsUsed', target: 1, reward: { herb: 8 } },
  { id: 'd_explore', name: '每日历练', desc: '今日完成 1 次历练', counterKey: 'explores', target: 1, reward: { wudao: 4 } }
]
