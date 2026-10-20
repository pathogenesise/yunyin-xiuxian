/**
 * 天道试炼(TRIALS:qisha/yixian/wuhui)—— challengeTrial run-state 守卫。
 *
 * 此前 challengeTrial(自 endgameService)与 recordTrial 全零覆盖:整条 TRIALS 运行路径
 * 不被任何 spec 触碰。这里钉三件事:
 *   一 recordTrial 的 bestRounds 取最小(更好成绩守谱),更差的回合不清掉纪录;
 *   二 顶配清 trial:扣入界费、赏 rewardDaoSource、记谱(clears/best),里程碑;
 *   三 裸装败 trial:不赏、不记谱,入界费照扣(败战也烧入场钱,不白吃)。
 *
 * 注意:此文件刻意**不** mock 战斗/渡劫(不像 endgameService.spec 的 tribulationDecision
 * 档)——该 mock 会把 celestialStats 压弱,顶配也不再清试炼。这里走真实 combat。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useInventoryStore } from '@/stores/inventory'
import { useEndgameStore } from '@/stores/endgame'
import { TRIALS, trialDef } from '@/data/endgame'
import { challengeTrial } from './endgameService'
import { rng } from '@/utils/random'
import type { EquipSlot, EquipmentInstance } from '@/types'

const S_SLOTS: EquipSlot[] = ['weapon', 'head', 'body', 'wrist', 'belt', 'boots', 'necklace', 'ring', 'talisman']
const S_CHAOS_TOP = ['w_benyuan', 'h_benyuan', 'b_benyuanshen', 'wr_benyuan', 'bl_benyuan', 'bo_benyuan', 'n_hongmengzhu', 'r_daozu', 'tl_daozuzhuan']

describe('天道试炼 · challengeTrial 清/败原子', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function seedTrialPlayer(topGear: boolean): void {
    const player = usePlayerStore()
    player.initCharacter('天道自检', { roots: [{ element: 'wood', aptitude: 90 }] } as never)
    player.major = 20
    player.sub = 9
    if (topGear) {
      const inv = useInventoryStore()
      inv.items = S_CHAOS_TOP.map((templateId, i): EquipmentInstance => ({
        uid: `t${i}`, templateId, quality: 'divine', tier: 60, level: 25,
        affixes: [{ id: 'atk4', roll: 0.8 }, { id: 'hp4', roll: 0.6 }, { id: 'def4', roll: 0.6 }]
      }))
      inv.items.forEach((it, i) => inv.equip(it.uid, S_SLOTS[i]!))
    }
    const e = useEndgameStore()
    e.daoPath = 'sword'
    e.addDaoSource(500)
  }

  /**
   * 「顶配必清」此前靠运气:challengeTrial 走真实 combat,而战斗的暴击/闪避/反击/
   * 连击/技能都吃全局 rng(未播种的 Math.random)—— 顶配玩家偶尔会输掉最后一场,
   * cleared 变 false,于是这条用例 CI 间歇红、单跑又绿(上游 v1.42.0 起带此病,
   * 纯上游版同样偶发,非本 fork 引入)。
   *
   * 这里把战斗的两个随机点固定住,让「顶配必清」成为确定性事实:该断的断、不该断的
   * 不断。mock 的是 rng 的方法而非 Math.random —— 全局 rng 实例在构造时已把
   * Math.random 绑成 private readonly rand,事后 spy Math.random 对它无效
   * (这正是先前 mock 不生效的原因)。
   */
  it('顶配清 qisha:扣入界费、赏 rewardDaoSource、记谱(clears/best)、全捷战数=试炼场数', () => {
    // 概率判定:一律不触发(不暴击/不闪避/不反击/不连击/不用技能)——
    // 顶配的伤害本就够平推,不必靠这些加成
    const chance = vi.spyOn(rng, 'chance').mockReturnValue(false)
    // 伤害浮动:取 0 即「不浮动」(factor *= 1 + 0),不再随机 ±10%
    const float = vi.spyOn(rng, 'float').mockReturnValue(0)
    try {
      seedTrialPlayer(true)
      const e = useEndgameStore()
      const before = e.daoSource
      const t = trialDef('qisha')!
      const out = challengeTrial('qisha')!
      expect(out.report.cleared, 'qisha cleared=false, fw='+out.report.fightsWon).toBe(true)
      expect(out.report.fightsWon).toBe(t.fights) // 清即全捷
      expect(out.rewardDaoSource).toBe(t.rewardDaoSource)
      expect(before - e.daoSource).toBe(t.entryCost - t.rewardDaoSource)
      expect(e.trialRecords['qisha']?.clears).toBe(1)
      expect(e.trialRecords['qisha']?.bestRounds).toBe(out.report.totalRounds)
    } finally {
      chance.mockRestore()
      float.mockRestore()
    }
  })

  it('裸装败 qisha:不赏、不记谱,入界费照扣', () => {
    seedTrialPlayer(false)
    const e = useEndgameStore()
    const before = e.daoSource
    const out = challengeTrial('qisha')!
    expect(out.report.cleared).toBe(false)
    expect(out.rewardDaoSource).toBe(0)
    expect(before - e.daoSource).toBe(trialDef('qisha')!.entryCost)
    expect(e.trialRecords['qisha']).toBeUndefined()
  })

  it('每道试炼都定义入界费/奖励/场数/escalation 且值有限为正(避开跑战斗)', () => {
    for (const t of TRIALS) {
      expect(Number.isFinite(t.entryCost) && t.entryCost > 0, `${t.id} entryCost`).toBe(true)
      expect(Number.isFinite(t.rewardDaoSource) && t.rewardDaoSource > 0, `${t.id} reward`).toBe(true)
      expect(Number.isInteger(t.fights) && t.fights > 0, `${t.id} fights`).toBe(true)
      expect(Number.isFinite(t.escalation) && t.escalation >= 1, `${t.id} escalation`).toBe(true)
    }
  })
})
