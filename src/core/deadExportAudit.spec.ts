/**
 * 死导出审计 —— 「导出」也是一种承诺
 *
 * 一个顶层导出活着的判据只有一条:**除声明处之外,src 里还有别人用**。
 * 没有别人的导出,读者会以为它被接上了,于是:
 *
 *   - isSoftCapped 写了半年没人调,软阈值就成了"面板暗改";
 *   - RULESET_CHANGELOG 写好了没人读,玩家问不到"天道变了什么";
 *   - CHAIN_EVENT_IDS 列着五个连锁事件的 id,而那五个事件根本不存在。
 *
 * 这三条都是本轮清扫出来的真事,共同点不是"代码写得差",而是
 * **没有任何机制阻止死导出继续躺在那里**。故本文件把这件事变成红线:
 *
 *   每个顶层导出,要么有人接,要么删掉;确有理由先留的,登记在 ALLOWLIST
 *   里写明原因和去处 —— 名单不常驻,一旦有人接上,这里立刻变红提醒销账。
 *
 * 故障注入:任意把 ALLOWLIST 里的一项接上(或删掉某个真导出的来源)都会变红;
 * 往 src 里加一个没人用的 `export const x = 1` 也会变红。
 *
 * 判据用 TypeScript 语法树,不是正则 —— 注释与字符串里的名字不算使用,
 * `obj.foo` 的属性名 / 接口字段名也不算,免得"提过一嘴"冒充"接线"。
 */
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const SRC = resolve(__dirname, '..')

/**
 * 有理由先留、暂不接线的导出。
 *
 * 每一项都必须写清「为什么留」和「什么时候销账」,
 * 写不出这两句的,就是一具应该删掉的尸体。
 */
const ALLOWLIST: Record<string, string> = {
  // 决策留档:接口先立、遥测后接(图谱里决策节点写的是"留",不是"删")
  analyzeChoices: '选择分析遥测:接口与判据先固化,等有真实遥测数据源再消费',
  valueGap: '与 analyzeChoices 同模块,同一决策下保留',
  // 未实装机制:链路一落地就接线,并从本名单销账
  isChainEvent: '奇遇连锁尚未实装(CHAIN_EVENT_IDS 列的是待建内容);实装即接线,届时应从本名单删除',
  getEventChainStage: '同上,与 isChainEvent 成对',
  // 已被别的审计钉住的两端
  studyBlueprint: '炼器图纸骨架:contentReachabilityAudit 已钉"读与给必须一起接",此处不重复扣押'
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

/** .vue 只取 <script> 块;返回可解析的源码 */
function scriptOf(path: string): string {
  const text = readFileSync(path, 'utf8')
  if (!path.endsWith('.vue')) return text
  return /<script[^>]*>([\s\S]*?)<\/script>/.exec(text)?.[1] ?? ''
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
}

/** 属性名/字段名/枚举成员不是"使用":`obj.foo`、`{ foo: 1 }`、`interface { foo: T }` 都不算 */
function isNonUseIdentifier(node: ts.Identifier, parent: ts.Node): boolean {
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node) ||
    (ts.isPropertyDeclaration(parent) && parent.name === node) ||
    (ts.isMethodDeclaration(parent) && parent.name === node) ||
    (ts.isMethodSignature(parent) && parent.name === node) ||
    (ts.isEnumMember(parent) && parent.name === node)
  )
}

interface DeadExport {
  name: string
  file: string
}

/** 全量扫描:顶层导出名 → 出现次数(声明处各计一次) */
function scanExports(): { dead: DeadExport[]; scanned: number; exports: number } {
  const files = walk(SRC)
  const declarations = new Map<string, number>()
  const declFile = new Map<string, string>()
  const uses = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string): void => void m.set(k, (m.get(k) ?? 0) + 1)

  for (const file of files) {
    const text = scriptOf(file)
    if (!text.trim()) continue
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const visit = (node: ts.Node): void => {
      const name =
        'name' in node && node.name && ts.isIdentifier(node.name as ts.Node) ? (node.name as ts.Identifier).text : null
      if (name && hasExportModifier(node)) {
        bump(declarations, name)
        if (!declFile.has(name)) declFile.set(name, relative(SRC, file))
      }
      if (ts.isVariableStatement(node) && hasExportModifier(node)) {
        for (const d of node.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) {
            bump(declarations, d.name.text)
            if (!declFile.has(d.name.text)) declFile.set(d.name.text, relative(SRC, file))
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  for (const file of files) {
    const text = scriptOf(file)
    if (!text.trim()) continue
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && !(node.parent && isNonUseIdentifier(node, node.parent))) bump(uses, node.text)
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  const dead: DeadExport[] = []
  for (const [name, count] of declarations) {
    // 声明处自己占一次;≤ 声明次数 ⇒ 除此之外无人提及
    if ((uses.get(name) ?? 0) <= count) dead.push({ name, file: declFile.get(name) ?? '?' })
  }
  return { dead: dead.sort((a, b) => a.name.localeCompare(b.name)), scanned: files.length, exports: declarations.size }
}

describe('死导出审计', () => {
  const { dead, scanned, exports } = scanExports()
  const deadNames = dead.map(d => d.name)

  it('扫描确实跑起来了(空库不算通过)', () => {
    expect(scanned).toBeGreaterThan(200)
    expect(exports).toBeGreaterThan(500)
  })

  it('不新增死导出:写下的每个导出都得有人接', () => {
    const unexpected = dead.filter(d => !(d.name in ALLOWLIST))
    expect(
      unexpected.map(d => `${d.file} → ${d.name}`),
      '这些导出在 src 里除声明处外无人引用:接上它,或删掉它;确要保留请在 ALLOWLIST 写明原因'
    ).toEqual([])
  })

  it('豁免不常驻:已被接上的条目必须立即销账', () => {
    const stale = Object.keys(ALLOWLIST).filter(name => !deadNames.includes(name))
    expect(stale, '这些名字已经有人接了(或已删除):请从 ALLOWLIST 里删掉,名单不是博物馆').toEqual([])
  })
})
