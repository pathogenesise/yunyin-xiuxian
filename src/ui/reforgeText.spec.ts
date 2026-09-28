import { describe, expect, it } from 'vitest'
import {
  lockDoneToast,
  lockShortToast,
  reforgeDoneToast,
  reforgeEmptyToast,
  reforgeLockedNote,
  reforgeShortToast,
  unlockDoneToast
} from './reforgeText'

describe('重铸与锁定提示 · 文言仍报清条数与尘石', () => {
  it('缺料、成铸、锁定不说不足', () => {
    expect(reforgeEmptyToast()).toContain('余地')
    expect(reforgeShortToast()).toContain('器灵尘')
    expect(reforgeShortToast()).toContain('灵石')
    expect(reforgeShortToast()).not.toContain('不足')
    expect(reforgeDoneToast('2 → 4 条', reforgeLockedNote(1))).toBe('天机重铸,词条 2 → 4 条(锁定 1 条未动)')
    expect(lockShortToast()).not.toContain('不足')
    expect(lockDoneToast('破军')).toBe('「破军」已锁定,重铸不移')
    expect(unlockDoneToast('破军')).toContain('已解锁')
  })

  it('提示里不再出现「封存」', () => {
    for (const line of [
      reforgeEmptyToast(),
      reforgeShortToast(),
      reforgeLockedNote(2),
      reforgeDoneToast('3 条', ''),
      lockShortToast(),
      lockDoneToast('破军'),
      unlockDoneToast('破军')
    ]) {
      expect(line, line).not.toContain('封存')
    }
  })
})
