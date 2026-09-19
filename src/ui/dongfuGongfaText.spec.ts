import { describe, expect, it } from 'vitest'
import {
  buildingDoneToast,
  buildingMansionGateToast,
  buildingPeakToast,
  buildingRealmGate,
  buildingShortToast
} from './buildingText'
import {
  gongfaAllLearnedToast,
  gongfaComprehendToast,
  gongfaPageShortToast,
  gongfaUpDoneToast,
  gongfaUpShortToast
} from './gongfaText'

describe('洞府与功法提示 · 文言仍报清层数与材料', () => {
  it('营造拒绝原因不说不足、升至', () => {
    expect(buildingRealmGate('筑基')).toBe('未至筑基境,难营此筑')
    expect(buildingPeakToast()).toContain('层巅')
    expect(buildingMansionGateToast()).toContain('洞府未广')
    expect(buildingShortToast()).toContain('灵石')
    expect(buildingShortToast()).toContain('玄铁')
    expect(buildingDoneToast('丹房', 4)).toBe('「丹房」营造再进,已至 4 级')
    expect(buildingDoneToast('丹房', 4)).not.toContain('升至')
  })

  it('参悟与精进仍报残页、悟道点与层数', () => {
    expect(gongfaPageShortToast()).toContain('残页')
    expect(gongfaPageShortToast()).not.toContain('不足')
    expect(gongfaAllLearnedToast()).toContain('尽数参透')
    expect(gongfaComprehendToast('太玄引气诀')).toContain('《太玄引气诀》')
    expect(gongfaUpShortToast()).toContain('悟道点')
    expect(gongfaUpDoneToast('太玄引气诀', 3)).toBe('《太玄引气诀》又进一重,已至第 3 层')
  })
})
