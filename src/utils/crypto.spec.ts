import { describe, expect, it } from 'vitest'
import { decryptSave, encryptSave, readSaveText } from './crypto'

describe('存档加密', () => {
  it('加解密往返一致', () => {
    const plain = JSON.stringify({ name: '顾望舒', exp: { m: 1.23, e: 45 } })
    const cipher = encryptSave(plain)
    expect(cipher).not.toBe(plain)
    expect(cipher.startsWith('{')).toBe(false)
    expect(decryptSave(cipher)).toBe(plain)
  })

  it('每次加密盐值不同,但都能解回', () => {
    const a = encryptSave('道')
    const b = encryptSave('道')
    expect(a).not.toBe(b)
    expect(decryptSave(a)).toBe('道')
    expect(decryptSave(b)).toBe('道')
  })

  it('非密文解密返回 null', () => {
    expect(decryptSave('{"plain":"json"}')).toBeNull()
    expect(decryptSave('随便一段文本')).toBeNull()
  })

  it('readSaveText 兼容旧版明文', () => {
    expect(readSaveText('{"a":1}')).toBe('{"a":1}')
    expect(readSaveText(encryptSave('{"a":1}'))).toBe('{"a":1}')
  })
})
