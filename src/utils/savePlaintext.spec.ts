/**
 * 明文存档不许被误当密文
 *
 * 游戏明确宣称「导入时兼容旧版明文 JSON」。而 readSaveText = decryptSave(raw) ?? raw,
 * 其中 decryptSave 直接把任何字符串当密文丢给 CryptoJS —— 而 CryptoJS 的 Base64
 * 解析会**跳过非法字符**,于是明文 JSON 也可能解出一段非空乱码(不抛、sigBytes 也不为 0),
 * 结果 readSaveText 返回乱码、JSON.parse 失败,导入报「文件内容无法解析」。
 *
 * 实测 500 条明文里约 3 条中招(≈0.6%),与内容有关、与环境无关 ——
 * 这正是那种「偶尔有人报、谁也复现不了」的缺陷。故这里钉死:
 *
 *   一 一批明文(时间戳逐条变化)全都不许被改动 —— 中招的那几条就在其中;
 *   二 一条具体样本也不许被「解」出东西(说明它根本没走解密);
 *   三 真密文仍解得开(修的是误判,不是把解密关掉)。
 *
 * 故障注入:去掉 decryptSave 开头的密文头检查,第一条立刻红。
 */
import { describe, expect, it } from 'vitest'
import { decryptSave, encryptSave, readSaveText } from './crypto'

/** 2026-01-01 起的毫秒基准 —— 每条样本都长这样,只有时间戳不同 */
const BASE_AT = 1767225600000

function plainEnvelope(exportedAt: number): string {
  return JSON.stringify({
    game: 'yunyin-xiuxian',
    version: 2,
    exportedAt,
    data: { game: { started: true }, player: null }
  })
}

describe('明文存档 · 不许被误当密文', () => {
  it('一批明文(时间戳逐条变化)全部原样读回', () => {
    // 中招率实测约 0.4%(500 条里 2 条),2000 条足以稳定暴露
    const bad: string[] = []
    for (let i = 0; i < 2000; i++) {
      const text = plainEnvelope(BASE_AT + i)
      if (readSaveText(text) !== text) bad.push(String(BASE_AT + i))
    }
    expect(bad, `这些明文被误读了:${bad.slice(0, 5).join('、')}`).toEqual([])
  })

  it('明文根本不进解密 —— 不会被「解」出任何东西', () => {
    const text = plainEnvelope(BASE_AT)
    expect(decryptSave(text), '明文不该被当密文解出乱码').toBeNull()
    expect(() => JSON.parse(readSaveText(text))).not.toThrow()
  })

  it('真密文仍解得开 —— 修的是误判,不是把解密关掉', () => {
    const plain = JSON.stringify({ game: 'yunyin-xiuxian', data: { x: 1 } })
    const cipher = encryptSave(plain)
    expect(cipher.startsWith('U2FsdGVkX1'), '本项目的密文都带 Salted__ 头').toBe(true)
    expect(decryptSave(cipher)).toBe(plain)
    expect(readSaveText(cipher)).toBe(plain)
  })
})
