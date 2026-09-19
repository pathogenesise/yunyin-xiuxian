import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { TALENTS } from '@/data/talents'
import { PETS } from '@/data/pets'
import { modsText } from './statNames'
import { petFuncText } from './itemText'

describe('天赋与灵兽详情带上实际词条', () => {
  it('人物页点开天赋会印 modsText,图鉴把词条接进说明', () => {
    const character = readFileSync(new URL('../views/CharacterView.vue', import.meta.url), 'utf8')
    const collection = readFileSync(new URL('../views/CollectionView.vue', import.meta.url), 'utf8')
    expect(character).toContain('modsText(tappedTalent.mods)')
    expect(collection).toContain('modsText(t.mods)')
    expect(collection).toContain('petFuncText(p)')
  })

  it('天赋与灵兽都有可印的词条,不是空串', () => {
    expect(TALENTS.every(t => modsText(t.mods).length > 0)).toBe(true)
    expect(PETS.every(p => petFuncText(p).length > 0)).toBe(true)
  })
})
