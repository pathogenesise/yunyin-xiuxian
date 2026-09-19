/**
 * 洞府巡游选项文案 —— 点数与时长只从奖励本体现算。
 *
 * 「获得少量修为」「提升灵气上限」这种话在三选一里无法比较。
 * 修为就是 gainExp 的那个整数,增益就是 buff 上的词条和时长。
 */
import type { CaveEvent } from '@/types'
import { buffDef } from '@/data/buffs'
import { formatChoiceSpan, formatNum } from '@/utils/format'
import { modsText } from './statNames'

type CaveOption = CaveEvent['options'][number]

const REWARD_NAME: Record<'exp' | 'stone' | 'herb' | 'wudao', string> = {
  exp: '修为',
  stone: '灵石',
  herb: '灵草',
  wudao: '悟道点'
}

function buffLine(id: string): string | undefined {
  const buff = buffDef(id)
  if (!buff) return undefined
  return `${modsText(buff.mods)},持续 ${formatChoiceSpan(buff.durationSec)}`
}

export function caveOptionText(opt: CaveOption): string {
  const parts: string[] = []
  if (opt.reward) {
    if (opt.reward.type === 'buff') {
      const line = buffLine(String(opt.reward.value))
      if (line) parts.push(line)
    } else {
      const n = Number(opt.reward.value)
      if (Number.isFinite(n) && n > 0) parts.push(`${REWARD_NAME[opt.reward.type]} +${formatNum(n)}`)
    }
  }
  if (opt.penalty) {
    const line = buffLine(`cave_penalty_${opt.penalty.type}`)
    if (line) parts.push(line)
  }
  return parts.length ? parts.join(';') : '无事发生'
}
