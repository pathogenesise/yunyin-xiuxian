/**
 * 记录与数值一致(Phase 39 设计记录)
 *
 * docs/superpowers/specs 里那一份记录写下了这一版的全部落点与两段界膜谶。
 * 文案最容易与代码脱节:回头把常数一改,记录就变成一份"曾经如此"的谎话,
 * 而没有任何地方会报错 —— 这类漂移在这个仓库里被反复踩过(见 singleSourceAudit)。
 *
 * 故这里把记录**当数据来读**:
 *   · 落点表逐行按常数拼出来比对(改了数没改记录就红);
 *   · 里程碑那一列按模拟器现算(曲线的读数不许手写);
 *   · 两段谶按原句比对(半删或改写都会红)。
 *
 * 「改动前」那一列不参与比对:它是当时的读数,冻结存档,本就不该随代码变化。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MAX_MAJOR, REALMS } from '@/data/realms'
import {
  CULT_BASE_SPEED,
  EXP_MAJOR_GROWTH,
  LATE_EXP_GROWTH,
  INSTANT_EXP_LAYER_CAP,
  QI_BASE_REGEN,
  TRIB_DEF_RESIST_CAP,
  TRIB_DEF_RESIST_PER_SURPLUS,
  TRIB_HP_GUARD_CAP,
  TRIB_WAVE_BASE,
  TRIB_WAVE_MAJOR,
  TRIB_WAVE_STEP,
  TRIB_WORLD_STEP_STAT_FOLD,
  WORLD_STEP_EXP_MULT
} from '@/data/constants'
import { hoursToReach } from './progressionSim'

const DOC = resolve(__dirname, '../../docs/superpowers/specs/2026-09-17-boundary-walls-phase39-design.md')
const doc = readFileSync(DOC, 'utf8')

/** 与记录同一套写法:一小时以内写分、两日以内写时、其上写天 */
const fmt = (h: number): string =>
  h < 1 ? `${(h * 60).toFixed(1)} 分` : h < 48 ? `${h.toFixed(1)} 时` : `${(h / 24).toFixed(1)} 天`

describe('Phase 39 记录 · 与数值一致', () => {
  it('两段界膜谶都在,且一古一今', () => {
    expect(doc, '改动前那一段(昔者)不见了').toContain('昔者道在眼前,今者道隔重渊')
    expect(doc, '改动后那一段(今者)不见了').toContain('壁已非壁,天已非天')
    expect(doc, '两段谶的定位说明不见了').toContain('## 一 两段谶:改动前后的世界')
  })

  it('落点表逐行对着常数 —— 改了数没改记录就会红', () => {
    const rows = [
      `| 基础修为/秒 | 1.6 | ${CULT_BASE_SPEED} |`,
      `| 基础灵气回复/秒 | 1.2 | ${QI_BASE_REGEN} |`,
      `| 修为需求/境(人间) | ×18 | ×${EXP_MAJOR_GROWTH} |`,
      `| 修为需求/境(界外) | ×4.4 | ×${LATE_EXP_GROWTH} |`,
      `| 界末圆满 | ×1.32(自然) | ×${WORLD_STEP_EXP_MULT}(加墙) |`,
      `| 天劫单波伤害 | 0.15 + 0.02×境界 + 0.03×第几道 | ${TRIB_WAVE_BASE} + ${TRIB_WAVE_MAJOR}×境界 + ${TRIB_WAVE_STEP}×第几道 |`,
      `| 三维折算率(防御/气血) | 每倍 5% | 每倍 ${Math.round(TRIB_DEF_RESIST_PER_SURPLUS * 100)}% |`,
      `| 三维折算上限(抗性 / 水位) | 30% / 60% | ${Math.round(TRIB_DEF_RESIST_CAP * 100)}% / ${Math.round(TRIB_HP_GUARD_CAP * 100)}% |`,
      `| 界膜那一劫的三维折算 | 照常吃 | 作废(${TRIB_WORLD_STEP_STAT_FOLD}) |`,
      `| 单枚修为丹的药力 | 当前一层需求的 7%~62% | 等效闭关时长,封顶不满一层(${INSTANT_EXP_LAYER_CAP}) |`
    ]
    for (const row of rows) {
      expect(doc, `记录里的这一行与常数对不上:\n  ${row}`).toContain(row)
    }
  })

  it('里程碑那一列按模拟器现算 —— 曲线的记录不许手写数字', () => {
    for (const [major, before] of [
      [1, '6.5 分'],
      [2, '26.8 分'],
      [3, '1.5 时'],
      [4, '4.9 时'],
      [5, '15.8 时'],
      [6, '2.1 天'],
      [7, '6.8 天'],
      [8, '22.1 天'],
      [9, '72.9 天'],
      [MAX_MAJOR, '11671.1 天']
    ] as const) {
      const row = `| ${REALMS[major]!.name} | ${before} | ${fmt(hoursToReach(major, 0))} |`
      expect(doc, `里程碑这一行与模拟器对不上:\n  ${row}`).toContain(row)
    }
  })
})
