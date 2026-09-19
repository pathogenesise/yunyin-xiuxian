import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERITAGE } from '@/core/samsaraAudit'
import { rebirthDecisionHint } from './rebirthText'

describe('rebirthDecisionHint', () => {
  it('matches carryGongfa: levels return to 1, artifacts are not kept', () => {
    const text = rebirthDecisionHint()
    expect(HERITAGE.find(r => r.id === 'artifacts')?.mode).toBe('reset')
    expect(HERITAGE.find(r => r.id === 'gongfa')?.mode).toBe('partial')
    expect(text).toContain('一层')
    expect(text).toContain('法宝')
    expect(text).not.toContain('折半')
    expect(text).not.toMatch(/保留[^。]*法宝/)
  })

  it('the character sheet uses the shared hint, not a second summary', () => {
    const src = readFileSync(resolve(__dirname, '../views/CharacterView.vue'), 'utf8')
    expect(src).toContain('rebirthDecisionHint()')
    expect(src).not.toContain('功法折半')
  })
})
