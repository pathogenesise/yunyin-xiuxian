/**
 * Pre-rebirth decision line. Must follow the same heritage table the
 * settlement dialog renders, not a second hand-written summary.
 */
import { HERITAGE } from '@/core/samsaraAudit'
import { MANUAL_REBIRTH_MIN_MAJOR } from '@/core/reincarnation'
import { REALMS } from '@/data/realms'

function row(id: string) {
  return HERITAGE.find(r => r.id === id)
}

/**
 * One sentence shown on the manual-rebirth button.
 * Gongfa memory stays and levels return to 1 (one full book at the top insight stage).
 * Artifacts are external goods and are wiped.
 */
export function rebirthDecisionHint(): string {
  const keep = [row('daoFruit'), row('talents')].filter(r => r?.mode === 'full').map(r => r!.name)
  const artifacts = row('artifacts')
  const realm = REALMS[MANUAL_REBIRTH_MIN_MAJOR]?.name ?? ''
  const parts = [
    keep.length ? `带走${keep.join('与')}` : '',
    '功法记得门类,层数回到一层;顶阶宿慧可留一门满层',
    artifacts?.mode === 'reset' ? `${artifacts.name}随皮囊散去` : '',
    realm ? `${realm}境方可自行兵解` : ''
  ].filter(Boolean)
  return `${parts.join('。')}。`
}
