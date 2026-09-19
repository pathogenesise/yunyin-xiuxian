import { describe, expect, it } from 'vitest'
import { CAVE_EVENT_POOL } from '@/data/earlyGame'
import { buffDef } from '@/data/buffs'
import { modsText } from './statNames'
import { formatChoiceSpan } from '@/utils/format'
import { caveOptionText } from './caveText'
import { readFileSync } from 'node:fs'

const options = Object.values(CAVE_EVENT_POOL).flatMap(list => list.flatMap(ev => ev.options))

describe('洞府巡游选项文案与发放同源', () => {
  it('即时奖励写出种类和数量,零值不假装有收获', () => {
    const exp = options.find(o => o.reward?.type === 'exp' && o.reward.value === 50)!
    expect(caveOptionText(exp)).toBe('修为 +50')
    const none = options.find(o => o.reward?.type === 'stone' && o.reward.value === 0)!
    expect(caveOptionText(none)).toBe('无事发生')
  })

  it('增益与惩罚都带上词条和持续时长', () => {
    const absorb = options.find(o => o.label === '强行吸收')!
    const penalty = buffDef(`cave_penalty_${absorb.penalty!.type}`)!
    expect(caveOptionText(absorb)).toContain('修为 +120')
    expect(caveOptionText(absorb)).toContain(modsText(penalty.mods))
    expect(caveOptionText(absorb)).toContain(formatChoiceSpan(penalty.durationSec))
    expect(absorb.penalty!.duration).toBe(penalty.durationSec)

    const fix = options.find(o => o.reward?.type === 'buff' && o.reward.value === 'cave_array_qicap')!
    const buff = buffDef('cave_array_qicap')!
    expect(caveOptionText(fix)).toBe(`${modsText(buff.mods)},持续 ${formatChoiceSpan(buff.durationSec)}`)
    expect(caveOptionText(fix)).not.toContain('提升灵气上限')
  })

  it('弹窗与回执都走现算文案', () => {
    const modal = readFileSync(new URL('../components/dongfu/CaveEventModal.vue', import.meta.url), 'utf8')
    const service = readFileSync(new URL('../core/earlyGameService.ts', import.meta.url), 'utf8')
    expect(modal).toContain('caveOptionText(')
    expect(modal).not.toContain('opt.effect')
    expect(service).toContain('caveOptionText(')
    expect(service).not.toContain('opt.effect')
  })
})
