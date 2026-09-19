import { describe, expect, it } from 'vitest'
import { WEATHERS, WORLD_WEATHERS, type WeatherDef } from '@/core/weather'
import { formatPercent } from '@/utils/format'
import { STAT_NAMES } from './statNames'
import { weatherEffectText } from './weatherText'
import { modsText } from './statNames'
import type { AnyStatKey } from '@/types'

const ALL: WeatherDef[] = [...WEATHERS, ...Object.values(WORLD_WEATHERS).flat()]

describe('天时效果行与定义同源', () => {
  it('每一条词条的百分比都出现在效果行里,符号方向正确', () => {
    for (const w of ALL) {
      const line = weatherEffectText(w)
      for (const [k, v] of Object.entries(w.mods)) {
        if (typeof v !== 'number' || v === 0) continue
        const name = STAT_NAMES[k as AnyStatKey] ?? k
        const signed = `${name} ${v > 0 ? '+' : '-'}${formatPercent(Math.abs(v))}`
        expect(line, `${w.name} 漏了 ${signed}`).toContain(signed)
      }
      if (w.tribulationMult !== 1) {
        const delta = w.tribulationMult - 1
        expect(line).toContain(`渡劫难度 ${delta > 0 ? '+' : '-'}${formatPercent(Math.abs(delta))}`)
      }
    }
  })

  it('负词条写成减号,而不是 +- ', () => {
    expect(modsText({ cultivationSpeed: -0.5, attackPct: 0.2 })).toBe('修炼速度 -50% · 攻击 +20%')
  })

  it('清和明示无加减,不把空白留给玩家猜', () => {
    const qinghe = WEATHERS.find(w => w.id === 'qinghe')!
    expect(weatherEffectText(qinghe)).toBe('今日无加减')
  })

  it('风味句不再承诺数据里没有的属系', () => {
    const byId = Object.fromEntries(WEATHERS.map(w => [w.id, w.desc]))
    expect(byId.chiyang).not.toContain('火')
    expect(byId.yueshi).not.toContain('幽冥')
    expect(byId.leiming).not.toContain('雷属')
    expect(byId.leiming, '渡劫与小进阶不是同一件事').not.toContain('突破')
    expect(byId.leiming).toContain('渡劫')
  })
})
