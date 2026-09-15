/* eslint-disable no-console */
/**
 * 楷体子集 · 覆盖验收
 *
 * 安卓不带楷体,故随包带一份霞鹜文楷子集(生成脚本:scripts/fonts/build-kai-font.py)。
 * 子集是**裁过的** —— 只留生成那一刻源码里出现的字 + GB2312 全字集。于是这里埋着一种
 * 只在内容更新时才现形的事故:新写的文案用了一个子集外生僻字,安卓上只有那一个字掉回
 * 衬线(整句里混进一个异类字形,比整句都用衬线更显眼),而本地开发(iOS/Windows 有
 * 系统楷体)根本看不出来。
 *
 * 两条判据:
 *   一 源码与模板里用到的每个字符,都必须在子集字表里 —— 红了就重跑生成脚本(它会
 *     同时更新字表与字体文件,见脚本里的注释)。规则与脚本的 needed_chars() 一致:
 *     src 下的 .ts/.vue/.js 加 index.html,这里没有额外放宽。
 *   二 字体文件本身要与记账文件对得上(sha256 + 字数)—— 只手改字表不重做字体,
 *     等于账面上覆盖了、文件里没有。
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const CHARS_FILE = resolve(ROOT, 'scripts/fonts/kai-subset.chars.txt')
const META_FILE = resolve(ROOT, 'scripts/fonts/kai-subset.meta.json')
const FONT_FILE = resolve(ROOT, 'src/assets/fonts/lxgw-wenkai-subset.woff2')

/** src 下所有 .ts/.vue/.js + 入口 index.html 里出现过的字符(与生成脚本同一条规则) */
function sourceChars(): Set<string> {
  const chars = new Set<string>()
  const eat = (text: string) => {
    for (const c of text) if (!/\s/.test(c)) chars.add(c)
  }
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.(ts|vue|js)$/.test(entry.name)) eat(readFileSync(path, 'utf-8'))
    }
  }
  walk(resolve(ROOT, 'src'))
  eat(readFileSync(resolve(ROOT, 'index.html'), 'utf-8'))
  return chars
}

describe('楷体子集 · 覆盖', () => {
  it('源码与模板里用到的每个字都在子集里', () => {
    const subset = new Set(readFileSync(CHARS_FILE, 'utf-8'))
    const missing = [...sourceChars()].filter(c => !subset.has(c))
    if (missing.length > 0) {
      console.log(`子集缺字 ${missing.length} 个:${missing.slice(0, 40).join('')}${missing.length > 40 ? ' …' : ''}`)
    }
    // 缺字意味着安卓上那几个字会突然换成衬线字体 —— 重跑生成脚本即可
    expect(missing.join('')).toBe('')
  })

  it('字体文件与记账文件对得上(换了字体就得重跑生成脚本)', () => {
    const meta = JSON.parse(readFileSync(META_FILE, 'utf-8')) as { subset_sha256: string; subset_chars: number }
    const bytes = readFileSync(FONT_FILE)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(meta.subset_sha256)
    expect([...readFileSync(CHARS_FILE, 'utf-8')].length).toBe(meta.subset_chars)
    // 顺带钉住体积:子集是 1.5MB 量级,长到几 MB 说明裁剪范围被改坏了
    expect(bytes.length).toBeLessThan(4 * 1024 * 1024)
  })
})
