import { describe, expect, it } from 'vitest'
import { BUFFS } from '@/data/buffs'
import { PILLS, pillDef } from '@/data/pills'
import { TALENTS } from '@/data/talents'

describe('进阶成功率相关文案不承诺大关', () => {
  it('凝神丹、破境丹风味只说小进阶,不说冲击境界', () => {
    const ning = pillDef('p_ningshen')!
    const po = pillDef('p_pojing')!
    expect(ning.desc).toContain('小进阶')
    expect(ning.desc).not.toContain('突破前')
    expect(po.desc).toContain('小进阶')
    expect(po.desc).toContain('大关')
    expect(po.desc).not.toContain('冲击境界')
  })

  it('带进阶成功率的 buff 说明都交代只动小进阶', () => {
    const rows = BUFFS.filter(b => b.mods.breakthroughRate)
    expect(rows.length, '进阶成功率 buff 被删了,这条就空转').toBeGreaterThan(2)
    for (const b of rows) {
      const ok = /小进阶|大关/.test(b.desc)
      expect(ok, `${b.id}「${b.desc}」没交代小进阶/大关边界`).toBe(true)
    }
  })

  it('带进阶成功率的天赋不把小进阶说成万事皆稳', () => {
    const rows = TALENTS.filter(t => t.mods.breakthroughRate)
    expect(rows.length).toBeGreaterThan(2)
    for (const t of rows) {
      expect(t.desc, `${t.id} 仍像万事皆管`).toContain('小进阶')
      expect(t.desc).not.toContain('突破稳当')
      expect(t.desc).not.toContain('大道坦途')
    }
  })

  it('聚福/巧匠/妖缘/迅捷风味对上已经改名的机制', () => {
    const byId = Object.fromEntries(TALENTS.map(t => [t.id, t]))
    expect(byId.t_jufu!.desc).toContain('战胜')
    expect(byId.t_jufu!.desc).not.toContain('灵石易得')
    expect(byId.t_qiao!.desc).toContain('强化')
    expect(byId.t_qiao!.desc).not.toContain('炼器天赋')
    expect(byId.t_yaoyuan!.desc).toContain('同程')
    expect(byId.t_yaoyuan!.desc).not.toContain('灵兽相随')
    expect(byId.t_xunjie!.desc).toContain('抢先')
    expect(byId.t_xunjie!.desc).not.toContain('先发制人')
    expect(PILLS.some(p => p.desc.includes('冲击境界'))).toBe(false)
  })
})
