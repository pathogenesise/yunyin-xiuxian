/* eslint-disable no-console -- 自检脚本的产出就是给人看的报告 */
/**
 * 界面冒烟 —— 把每个页面上的按钮都点一遍,看有没有运行时异常
 *
 * 与 layout-check 的分工:那边量排版,这边戳交互。
 * 静态审计能查「有没有接线」,查不出「点下去会不会炸」——比如某个弹窗打开时
 * 读了一个只在特定存档下才存在的字段。故这里用真浏览器真存档,逐页点按钮。
 *
 * 用法(需要 playwright,不写进依赖):
 *   bun run build
 *   npm i --no-save playwright
 *   node scripts/ui-smoke.mjs             # 每页最多点 12 个按钮
 *   node scripts/ui-smoke.mjs --depth 25  # 点更多
 *   node scripts/ui-smoke.mjs --late      # 用后期夹具存档(神人境)覆盖终局界面
 *
 * 会跳过有破坏性的按钮(分解/删除/清空/重置/兵解/转世),免得把冒烟盘玩坏。
 * 发现 pageerror 即失败并打印堆栈前几行 —— 那通常就是一处真 bug。
 *
 * ⚠ 夹具说明:存档密钥就写在包里(见 utils/crypto 的注释:并非安全边界),
 * 故这里能照同一套格式造一份"神人境"存档。它是**自检夹具**,不是作弊入口:
 * 别把它当推荐玩法,也别据此以为存档不可改。
 *
 * ⚠ --late 很慢(一轮约十分钟):终局页面上的按钮会真的触发模拟
 * (突破推演 / 远征预估 / 挑战书定价),不是脚本卡住了。日常冒烟用默认模式。
 */
import { chromium } from 'playwright'
import CryptoJS from 'crypto-js'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = `file://${join(ROOT, 'dist/index.html')}`
const depthArg = process.argv.indexOf('--depth')
const DEPTH = depthArg > 0 ? Number(process.argv[depthArg + 1]) || 12 : 12
const LATE = process.argv.includes('--late')

/**
 * 全量路由 —— 从前只点九页,流派/收藏/修仙录/洞府/本世之界/天界这六页
 * 只被排版自检量过尺寸,没人戳过它们的按钮(点下去会不会炸、有没有 NaN 泄漏都没看过)。
 */
const ROUTES = [
  '/',
  '/cultivation',
  '/adventure',
  '/inventory',
  '/character',
  '/codex',
  '/souls',
  '/titles',
  '/settings',
  '/build',
  '/collection',
  '/legacy',
  '/dongfu',
  '/world',
  '/celestial'
]
/** 正文里不该出现的数字/占位泄漏 */
const NUMERIC_LEAK = ['NaN', 'Infinity', 'undefined']
/** 破坏性/离开型按钮:冒烟盘上不点 */
const SKIP = /分解|删除|清空|重置|兵解|转世|散尽|导出|导入|隐私|关于我们|出 秘 境|暂别/

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] })
const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
if (LATE) {
  const gn = (m, e) => ({ m, e })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const slices = {
    /**
     * 时间戳用"现在":夹具若写 1970,离线结算会去补算半个世纪的挂机收益 ——
     * 冒烟脚本每翻一页都要重算一次,一轮要跑十分钟(实测)。
     */
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: {
      major: 14,
      sub: 0,
      exp: gn(0, 0),
      age: 3000,
      lifespanBonusYears: 0,
      dead: false,
      reincarnation: { count: 2, daoFruit: 12, talents: [], insight: 400, lives: [], vow: null, trial: null, bonds: [] },
      linggen: { roots: [{ element: 'fire', aptitude: 88 }, { element: 'water', aptitude: 70 }], gradeName: '双灵根', growthMult: 1.4 }
    },
    resources: { spiritStone: gn(9, 12), qi: 5000, wudao: 800, herb: 900, ore: 900, page: 300, dust: 500 },
    /**
     * 装备两件「背水」词条 —— 攒出一路流派。没有这一步,流派页的成路界面
     * (五维评级 / 组合技 / 成路来源)在冒烟里根本不会渲染,等于没测。
     */
    inventory: {
      items: [
        { uid: 'smoke_w', templateId: 'w_zidian', quality: 'heaven', tier: 20, level: 0, affixes: [{ id: 'bs3', roll: 1 }] },
        { uid: 'smoke_a', templateId: 'a_hufu', quality: 'heaven', tier: 20, level: 0, affixes: [{ id: 'low2', roll: 1 }] }
      ],
      equipped: { weapon: 'smoke_w', armor: 'smoke_a' },
      pills: {},
      artifacts: [],
      equippedArtifacts: []
    },
    endgame: { daoPath: 'sword', daoSource: 1200, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'dark' }
  }
  await context.addInitScript(
    data => {
      if (localStorage.getItem('__smokeFixture')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__smokeFixture', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
}
const page = await context.newPage()
const errors = []
/**
 * 点了没反应的按钮 —— 只报告,不判失败。
 *
 * 判据是「点击前后看不出任何变化」:正文文本、弹窗数、toast 数都没动。
 * 空白点击有时是合理的(比如点一个已选中的页签),故先当读数看:
 * 一屏里要是冒出十几个,那就说明有一批入口在静默失败。
 */
const silent = []
async function fingerprint() {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000)
    return `${text.length}:${text.slice(0, 120)}:${text.slice(-80)}|${document.querySelectorAll('.modal-panel').length}|${document.querySelectorAll('[class*=toast]').length}`
  })
}
page.on('pageerror', e => errors.push({ where: 'boot', msg: String(e).slice(0, 300) }))

await page.goto(INDEX, { waitUntil: 'load' })
if (!LATE) {
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('冒烟自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
}
await page.waitForTimeout(LATE ? 1800 : 1500)

let clicked = 0
/** 弹窗里的按钮也要点 —— 大部分交互都藏在 modal 里(炼丹/收纳/人物各入口/天界册页) */
async function clickInsideModal(route) {
  const panel = page.locator('.modal-panel').first()
  if (!(await panel.count())) return
  const inner = await panel.getByRole('button').all()
  for (const b of inner.slice(0, 6)) {
    const label = ((await b.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
    if (!label || SKIP.test(label)) continue
    if (!(await b.isVisible().catch(() => false))) continue
    if (await b.isDisabled().catch(() => false)) continue
    const before = errors.length
    await b.click({ timeout: 800 }).catch(() => {})
    clicked += 1
    await page.waitForTimeout(160)
    if (errors.length > before) errors[errors.length - 1].where = `${route} 弹窗内点「${label}」`
  }
}

for (const route of ROUTES) {
  await page.goto(INDEX + '#' + route, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  /**
   * 数字体检:正文里出现 NaN / Infinity / undefined 一律算失败。
   * 这类泄漏在单元测试里看不出来(函数返回了"数字"),到了百万级数值与
   * 除法密集的后期界面才现形 —— 后期夹具正是为它准备的。
   */
  const leaked = await page.evaluate((patterns) => {
    const text = document.body.innerText
    return patterns.filter(p => text.includes(p)).map(p => {
      const i = text.indexOf(p)
      return `${p}@…${text.slice(Math.max(0, i - 24), i + 24).replace(/\n/g, '↵')}…`
    })
  }, NUMERIC_LEAK)
  for (const l of leaked) errors.push({ where: `${route} 正文泄漏`, msg: l })
  const buttons = await page.getByRole('button').all()
  for (const b of buttons.slice(0, DEPTH)) {
    const label = ((await b.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
    if (!label || SKIP.test(label)) continue
    if (!(await b.isVisible().catch(() => false))) continue
    if (await b.isDisabled().catch(() => false)) continue
    const before = errors.length
    const beforeFp = await fingerprint()
    await b.click({ timeout: 800 }).catch(() => {})
    clicked += 1
    await page.waitForTimeout(160)
    if (errors.length > before) errors[errors.length - 1].where = `${route} 点「${label}」`
    else if ((await fingerprint()) === beforeFp) silent.push(`${route} 点「${label}」`)
    await clickInsideModal(route)
    // 点开弹窗后关掉,免得挡住后面的按钮
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(80)
  }
}

await browser.close()
console.log(`\n界面冒烟:${ROUTES.length} 页,点击 ${clicked} 次(每页上限 ${DEPTH})`)
if (silent.length) {
  console.log(`点了没反应 ${silent.length} 处(读数,不判失败):`)
  for (const s of silent.slice(0, 20)) console.log(`  · ${s}`)
}
if (errors.length === 0) {
  console.log('✓ 无运行时异常')
} else {
  for (const e of errors) console.log(`✗ ${e.where}\n   ${e.msg.split('\n')[0]}`)
  process.exitCode = 1
}
