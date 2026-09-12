/* eslint-disable no-console -- 自检脚本的产出就是给人看的报告 */
/**
 * 排版自检 —— 手机尺寸下逐页量一遍「有没有横向溢出」
 *
 * 用法(需要 playwright,不写进依赖,免得 CI 背一个浏览器):
 *   bun run build
 *   npm i --no-save playwright        # 或全局装;浏览器缓存在 ~/.cache/ms-playwright
 *   node scripts/layout-check.mjs     # 加 --shots 顺带存图到 /tmp/layout-shots
 *
 * 它做五件事:
 *   一 走完真实建号流程(同意隐私 → 命名 → 踏入仙途),拿到一份真存档;
 *   二 在 375×812 与 320×568 两个宽度下,逐页量 scrollWidth 与越界元素;
 *   三 把「底部导航五项」「无 pageerror」「控件都有可访问名」「可点元素不小于 28px」也一并核对;
 *   四 把浏览器存储卡死(令 setItem 抛错),看设置页会不会把「写不进去」说出来 ——
 *      静默丢档是玩家看不见的事故,只能靠这一条端到端核。
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
/**
 * 全量路由 —— 从前只巡八页,于是设置页与收藏页的排版与选中态从未被量过。
 * 页面各有各的布局风险,漏一页等于那一页没有守卫(加进来只多几秒)。
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
        navItems: document.querySelectorAll('nav button, nav a').length,
        /**
         * 只有图标的控件必须自带可访问名(aria-label / 可见文字)。
         * 没有名字,读屏只会念「按钮」「链接」,自动化也无从按名字点它。
         */
        unnamed: [...document.querySelectorAll('button, a, [role=button]')]
          .filter(el => {
            const name = (el.getAttribute('aria-label') || el.textContent || '').trim()
            if (name) return false
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0
          })
          .slice(0, 3)
          .map(el => el.outerHTML.slice(0, 80).replace(/\s+/g, ' ')),
        /**
         * 可点元素的高度下限 28px —— 拇指点得着的最起码尺寸。
         * 实测(带装备的后期档,375/320 两档):修前有 47 个不足 24px、26 个不足 28px,
         * 大多是把文字行直接当按钮(属性来源行、返回链接、设置里的胶囊按钮)。
         */
        smallTargets: [...document.querySelectorAll('button, a, [role=button]')]
          .map(el => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < 28)
          .slice(0, 3)
          .map(({ el, r }) => `${Math.round(r.height)}px «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 12)}»`),
        /**
         * 选择型控件的选中态要对机器可读,且**每组恰有一个**。
         *
         * 此前主题/战报速度/页签的选中全靠边色,读屏用户与自动化都看不出选了哪个
         * (上一轮补了 aria-label/aria-pressed,这里把「恰好一个」钉住)。
         */
        badGroups: (() => {
          const out = []
          for (const attr of ['aria-pressed', 'aria-selected']) {
            const byParent = new Map()
            for (const el of document.querySelectorAll(`[${attr}]`)) {
              const parent = el.parentElement
              if (!parent) continue
              byParent.set(parent, [...(byParent.get(parent) ?? []), el])
            }
            for (const [parent, els] of byParent) {
              if (els.length < 2) continue
              const on = els.filter(e => e.getAttribute(attr) === 'true').length
              if (on !== 1) out.push(`${attr} 组(${els.length} 项)里有 ${on} 个选中`)
            }
          }
          // 页签:每一组(同一父容器下 ≥2 个 role=tab)恰有一个 aria-selected=true
          const tabsByParent = new Map()
          for (const el of document.querySelectorAll('[role=tab]')) {
            const parent = el.parentElement
            if (!parent) continue
            tabsByParent.set(parent, [...(tabsByParent.get(parent) ?? []), el])
          }
          for (const [, els] of tabsByParent) {
            if (els.length < 2) continue
            const on = els.filter(e => e.getAttribute('aria-selected') === 'true').length
            if (on !== 1) out.push(`页签组(${els.length} 项)里有 ${on} 个选中`)
          }
          // 设置页的两组选择(主题、战报速度)是明文约定:少了哪一组这里就红
          if (location.hash.startsWith('#/settings')) {
            const pressed = document.querySelectorAll('[aria-pressed]').length
            if (pressed < 6) out.push(`设置页的选择控件只有 ${pressed} 个带 aria-pressed(主题 3 + 速度 3)`)
          }
          return out.slice(0, 3)
        })()
      }
    })
    checked += 1
    const problems = []
    if (info.horizontalOverflow) problems.push(`横向溢出(scrollWidth ${info.hash})`)
    if (info.overflows.length) problems.push(`越界元素:${info.overflows.join(', ')}`)
    if (info.unnamed.length) problems.push(`无名控件:${info.unnamed.join(' | ')}`)
    if (info.smallTargets.length) problems.push(`可点元素过小:${info.smallTargets.join(' | ')}`)
    if (info.badGroups.length) problems.push(`选择组没选中态:${info.badGroups.join(' | ')}`)
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

// ---- 第四件事:存档写不进去时,设置页必须说话 ----
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('存档自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1200)

  // 卡死存储:此后任何写盘都抛配额错误(引擎每秒仍在改状态,故几秒内必然撞上一次刷盘)
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('quota', 'QuotaExceededError')
    }
  })
  await page.waitForTimeout(6500)
  await page.evaluate(() => {
    location.hash = '#/settings'
  })
  await page.waitForTimeout(800)
  const warned = await page.evaluate(() => document.body.innerText.includes('上次写入存档失败'))
  checked += 1
  if (!warned) failures.push('[375] /settings → 存档写失败时设置页没有提示(静默丢档)')
  if (pageErrors.length) failures.push(`[375] 存档失败场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

// ---- 第五件事:弹窗的键盘与焦点 ----
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('焦点自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    location.hash = '#/settings'
  })
  await page.waitForTimeout(700)

  const trigger = page.getByRole('button', { name: /关于/ }).first()
  await trigger.click()
  await page.waitForTimeout(350)
  const opened = await page.evaluate(() => {
    const panel = document.querySelector('.modal-panel')
    const active = document.activeElement
    return {
      role: panel?.getAttribute('role'),
      modal: panel?.getAttribute('aria-modal'),
      inside: !!(panel && active && panel.contains(active))
    }
  })
  checked += 1
  if (opened.role !== 'dialog' || opened.modal !== 'true') failures.push('[375] 弹窗没有 dialog 语义(role/aria-modal)')
  if (!opened.inside) failures.push('[375] 弹窗打开后焦点没进去 —— 键盘用户不知道弹窗开了')

  // 连按六次 Tab:焦点必须一直在弹窗里(此前会一路跑到页面与底部导航)
  let escaped = false
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => {
      const panel = document.querySelector('.modal-panel')
      const active = document.activeElement
      return !!(panel && active && panel.contains(active))
    })
    if (!inside) escaped = true
  }
  if (escaped) failures.push('[375] 弹窗里按 Tab 会跑到背后的页面(焦点没有被困住)')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const afterEsc = await page.evaluate(() => ({
    stillOpen: !!document.querySelector('.modal-panel'),
    backOnTrigger: (document.activeElement?.textContent || '').includes('关于')
  }))
  if (afterEsc.stillOpen) failures.push('[375] Esc 没能关掉弹窗')
  if (!afterEsc.backOnTrigger) failures.push('[375] 关掉弹窗后焦点没还给打开它的那个按钮')
  if (pageErrors.length) failures.push(`[375] 弹窗焦点场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

await browser.close()
console.log(`\n排版自检:${checked} 个页面 × 视口组合`)
if (failures.length === 0) {
  console.log('✓ 无横向溢出、无越界元素、底部导航五项齐全、控件有名且不小于 28px、选择项有选中态')
  if (SHOTS) console.log(`  截图已存 ${SHOTS_DIR}`)
} else {
  for (const f of failures) console.log(`✗ ${f}`)
  process.exitCode = 1
}
