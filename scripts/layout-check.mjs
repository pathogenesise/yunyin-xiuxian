/**
 * 排版自检 —— 手机尺寸下逐页量一遍「有没有横向溢出」
 *
 * 用法(需要 playwright,不写进依赖,免得 CI 背一个浏览器):
 *   bun run build
 *   npm i --no-save playwright        # 或全局装;浏览器缓存在 ~/.cache/ms-playwright
 *   node scripts/layout-check.mjs     # 加 --shots 顺带存图到 /tmp/layout-shots
 *
 * 它做三件事:
 *   一 走完真实建号流程(同意隐私 → 命名 → 踏入仙途),拿到一份真存档;
 *   二 在 375×812 与 320×568 两个宽度下,逐页量 scrollWidth 与越界元素;
 *   三 把「底部导航五项」「无 pageerror」也一并核对。
 *
 * 判据是「横向溢出」这一类——它正是窄屏上最常见的排版事故。
 * 说明:这是无头 Chromium 的视口模拟,不是真机;字体渲染与安全区(刘海/手势条)
 * 仍需真机确认,故本脚本过绿不等于真机过绿。
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = `file://${join(ROOT, 'dist/index.html')}`
const SHOTS_DIR = '/tmp/layout-shots'
const SHOTS = process.argv.includes('--shots')

const VIEWPORTS = [
  { width: 375, height: 812, tag: '375' },
  { width: 320, height: 568, tag: '320' }
]
const ROUTES = ['/', '/cultivation', '/adventure', '/inventory', '/character', '/codex', '/souls', '/titles']

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] })
const failures = []
let checked = 0

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))

  await page.goto(INDEX, { waitUntil: 'load' })
  // 建号:同意隐私 → 传送门(约 2.5s)→ 命名 → 踏入仙途
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('排版自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1200)

  for (const route of ROUTES) {
    await page.goto(INDEX + '#' + route, { waitUntil: 'load' })
    await page.waitForTimeout(700)
    const info = await page.evaluate(() => {
      const vw = window.innerWidth
      const overflows = [...document.querySelectorAll('body *')]
        .filter(el => {
          const r = el.getBoundingClientRect()
          if (r.width <= 0 || r.right <= vw + 2) return false
          // 纯装饰层(墨爆/传送门)故意超出视口,且不吃事件,不算排版事故
          return !el.classList.contains('pointer-events-none') && !el.closest('.pointer-events-none')
        })
        .slice(0, 4)
        .map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}@${Math.round(el.getBoundingClientRect().right)}`)
      return {
        hash: location.hash,
        horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
        overflows,
        navItems: document.querySelectorAll('nav button, nav a').length
      }
    })
    checked += 1
    const problems = []
    if (info.horizontalOverflow) problems.push(`横向溢出(scrollWidth ${info.hash})`)
    if (info.overflows.length) problems.push(`越界元素:${info.overflows.join(', ')}`)
    if (info.navItems !== 5) problems.push(`底部导航 ${info.navItems} 项(应为 5)`)
    if (problems.length) failures.push(`[${vp.tag}] ${route} → ${problems.join(' / ')}`)
    if (SHOTS) {
      mkdirSync(SHOTS_DIR, { recursive: true })
      await page.screenshot({ path: join(SHOTS_DIR, `${vp.tag}${route.replace(/\//g, '_')}.png`), fullPage: true })
    }
  }
  if (pageErrors.length) failures.push(`[${vp.tag}] 页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

await browser.close()
console.log(`\n排版自检:${checked} 个页面 × 视口组合`)
if (failures.length === 0) {
  console.log('✓ 无横向溢出、无越界元素、底部导航五项齐全')
  if (SHOTS) console.log(`  截图已存 ${SHOTS_DIR}`)
} else {
  for (const f of failures) console.log(`✗ ${f}`)
  process.exitCode = 1
}
