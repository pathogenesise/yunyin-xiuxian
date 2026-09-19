import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EQUIP_LEVEL_BONUS } from '@/data/constants'
import { formatPercent } from '@/utils/format'
import { equipNextLevelText } from './equipText'

describe('equipNextLevelText', () => {
  it('裸装第一级等于常数,已强化的再涨按当前倍率折', () => {
    expect(equipNextLevelText(0)).toContain(formatPercent(EQUIP_LEVEL_BONUS))
    const rel = EQUIP_LEVEL_BONUS / (1 + 5 * EQUIP_LEVEL_BONUS)
    expect(equipNextLevelText(5)).toContain(`此刻再涨 ${formatPercent(rel)}`)
    expect(rel).toBeLessThan(EQUIP_LEVEL_BONUS)
  })

  it('装备详情在强化前写出这一行,不手写 12%', () => {
    const src = readFileSync(resolve(__dirname, '../components/equipment/EquipmentDetailDialog.vue'), 'utf8')
    expect(src).toContain('equipNextLevelText(inst.level)')
    expect(src).not.toContain('基础属性 +12%')
  })
})
