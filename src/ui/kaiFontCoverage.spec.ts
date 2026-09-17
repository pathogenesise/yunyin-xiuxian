/* eslint-disable no-console */
/**
 * 楷体子集 · 覆盖验收
 *
 * 安卓不带楷体,故随包带一份霞鹜文楷(GB 屏幕阅读版)子集 —— 生成脚本:
 * scripts/fonts/build-kai-font.py。三端已统一用这份字体,所以「字体里有没有这个字」
 * 直接决定所有端看到的字形。
 *
 * 子集是**裁过的**:只留生成那一刻源码里出现的字 + GB2312 全字集。于是这里埋着一种
 * 只在内容更新时才现形的事故:新写的文案用了一个子集外的字,那一处会掉回系统字体
 * (整句里混进一个异类字形,比整句都用衬线更显眼),而本地开发往往看不出来。
 *
 * 两条判据:
 *   一 源码与模板里用到的每个字符,要么在**字体真实的 cmap** 里,要么在生成脚本
 *      记下的「交给系统字体画」名单里(▬▸▾◈✧ 这类装饰符号,母体里本来就没有)——
 *      红了就重跑生成脚本。注意比对的是字体实际收进去的字,不是「我要求收的字」:
 *      两者会差,照抄请求集等于开了张空头支票。
 *   二 字体文件本身要与记账对得上(sha256 + 字数)—— 只手改字表不重做字体,
 *      等于账面上覆盖了、文件里没有。
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const CHARS_FILE = resolve(ROOT, 'scripts/fonts/kai-subset.chars.txt')
const META_FILE = resolve(ROOT, 'scripts/fonts/kai-subset.meta.json')
const FONT_FILE = resolve(ROOT, 'src/assets/fonts/lxgw-wenkai-gb-screen-subset.woff2')

/**
 * src 下所有 .ts/.vue/.js(跳过 *.spec.ts)+ 入口 index.html 里出现过的字符 ——
 * 与生成脚本的 needed_chars() 同一条规则:用例里有别人写下的正则区间端点
 * (如 /[⺀-鿿　-〿＀-￯]/ 的两端),那两个字符不会出现在界面上,不该算进来。
 */
function sourceChars(): Set<string> {
  const chars = new Set<string>()
  const eat = (text: string) => {
    for (const c of text) if (!/\s/.test(c)) chars.add(c)
  }
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.(ts|vue|js)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) eat(readFileSync(path, 'utf-8'))
    }
  }
  walk(resolve(ROOT, 'src'))
  eat(readFileSync(resolve(ROOT, 'index.html'), 'utf-8'))
  return chars
}

describe('楷体子集 · 覆盖', () => {
  it('源码与模板里用到的每个字,要么字体画得出,要么在「交给系统字体」名单里', () => {
    // 字表是生成脚本从**产物**读回来的真实 cmap,不是「要求包含的字」
    const subset = new Set(readFileSync(CHARS_FILE, 'utf-8'))
    const meta = JSON.parse(readFileSync(META_FILE, 'utf-8')) as { delegated_to_system?: string; subset_chars: number }
    const delegated = new Set(meta.delegated_to_system ?? '')
    const missing = [...sourceChars()].filter(c => !subset.has(c) && !delegated.has(c))
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
