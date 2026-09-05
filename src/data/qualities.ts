/** 装备/物品品质体系 */
import type { QualityDef, QualityId } from '@/types'
import { QUALITY_WEIGHTS } from './constants'

export const QUALITIES: QualityDef[] = [
  { id: 'mortal', name: '凡品', rank: 0, mult: 1.0, affixes: [0, 1], weight: QUALITY_WEIGHTS[0], color: '#857F70' },
  { id: 'fine', name: '良品', rank: 1, mult: 1.25, affixes: [1, 2], weight: QUALITY_WEIGHTS[1], color: '#6E8B74' },
  { id: 'excellent', name: '精品', rank: 2, mult: 1.6, affixes: [2, 2], weight: QUALITY_WEIGHTS[2], color: '#4F7699' },
  { id: 'spirit', name: '灵品', rank: 3, mult: 2.1, affixes: [2, 3], weight: QUALITY_WEIGHTS[3], color: '#7B5EA7' },
  { id: 'profound', name: '玄品', rank: 4, mult: 2.8, affixes: [3, 4], weight: QUALITY_WEIGHTS[4], color: '#A85C3F' },
  { id: 'earth', name: '地品', rank: 5, mult: 3.7, affixes: [4, 4], weight: QUALITY_WEIGHTS[5], color: '#B07D2B' },
  { id: 'heaven', name: '天品', rank: 6, mult: 5.0, affixes: [4, 5], weight: QUALITY_WEIGHTS[6], color: '#C9A227' },
  { id: 'immortal', name: '仙品', rank: 7, mult: 6.8, affixes: [5, 6], weight: QUALITY_WEIGHTS[7], color: '#3E8E8B' },
  { id: 'divine', name: '神品', rank: 8, mult: 9.5, affixes: [6, 6], weight: QUALITY_WEIGHTS[8], color: '#A83F39' }
]

const BY_ID = new Map<QualityId, QualityDef>(QUALITIES.map(q => [q.id, q]))

export function qualityDef(id: QualityId): QualityDef {
  return BY_ID.get(id) ?? QUALITIES[0]!
}

export function qualityByRank(rank: number): QualityDef {
  return QUALITIES[Math.max(0, Math.min(QUALITIES.length - 1, rank))]!
}
