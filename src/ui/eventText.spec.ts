import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENTS } from '@/data/events'
import { stoneByTier } from '@/core/formulas'
import { formatGN } from '@/utils/format'
import { choiceHintText } from './eventText'

describe('choiceHintText', () => {
  it('同一花费只报一个数,竞拍那种高低价报区间', () => {
    const merchant = EVENTS.find(e => e.id === 'ev_merchant')!
    const buy = merchant.choices[0]!
    const text = choiceHintText(buy, 3)
    expect(text).toBe(`花费灵石 ${formatGN(stoneByTier(3, 30))}`)
    expect(text).not.toContain('需要灵石')

    const auction = EVENTS.find(e => e.id === 'ev_yaodan_auction')!
    const bid = auction.choices[0]!
    const bidText = choiceHintText(bid, 4)
    expect(bidText).toContain(formatGN(stoneByTier(4, 60)))
    expect(bidText).toContain(formatGN(stoneByTier(4, 80)))
    expect(bidText.startsWith('花费灵石')).toBe(true)
    const tea = EVENTS.find(e => e.id === 'ev_border_stall')!
    const pay = tea.choices.find(c => c.cond?.type === 'stone')!
    expect(choiceHintText(pay, 2)).toContain('可能花费灵石')
  })

  it('际遇弹窗用算出来的提示,不再直接渲染手写 hint', () => {
    const src = readFileSync(resolve(__dirname, '../components/adventure/EventDialog.vue'), 'utf8')
    expect(src).toContain('choiceHintText(choice, tier)')
    expect(src).not.toContain('choice.hint')
  })
})
