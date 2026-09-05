/** 五行与特殊灵根元数据 */
import type { ElementId } from '@/types'

export interface ElementMeta {
  id: ElementId
  name: string
  /** 单字符号,用于水墨圆章展示 */
  char: string
  color: string
  special: boolean
}

export const ELEMENTS: Record<ElementId, ElementMeta> = {
  metal: { id: 'metal', name: '金', char: '金', color: '#9C7A3C', special: false },
  wood: { id: 'wood', name: '木', char: '木', color: '#6E8B74', special: false },
  water: { id: 'water', name: '水', char: '水', color: '#4F7699', special: false },
  fire: { id: 'fire', name: '火', char: '火', color: '#A83F39', special: false },
  earth: { id: 'earth', name: '土', char: '土', color: '#8A6F4D', special: false },
  wind: { id: 'wind', name: '风', char: '风', color: '#5E8C8A', special: true },
  thunder: { id: 'thunder', name: '雷', char: '雷', color: '#7B5EA7', special: true },
  ice: { id: 'ice', name: '冰', char: '冰', color: '#6D93B8', special: true },
  light: { id: 'light', name: '光', char: '光', color: '#C9A227', special: true },
  dark: { id: 'dark', name: '暗', char: '暗', color: '#4A463D', special: true },
  chaos: { id: 'chaos', name: '混沌', char: '混', color: '#292722', special: true }
}

export const BASIC_ELEMENTS: ElementId[] = ['metal', 'wood', 'water', 'fire', 'earth']
export const SPECIAL_ELEMENTS: ElementId[] = ['wind', 'thunder', 'ice', 'light', 'dark']
