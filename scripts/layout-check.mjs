/* eslint-disable no-console -- 自检脚本的产出就是给人看的报告 */
/**
 * 排版自检 —— 手机尺寸下逐页量一遍「有没有横向溢出」
 *
 * 用法(需要 playwright,不写进依赖,免得 CI 背一个浏览器):
 *   bun run build
 *   npm i --no-save playwright        # 或全局装;浏览器缓存在 ~/.cache/ms-playwright
 *   node scripts/layout-check.mjs     # 加 --shots 顺带存图到 /tmp/layout-shots
 *
 * 它做七件事:
 *   一 走完真实建号流程(同意隐私 → 命名 → 踏入仙途),拿到一份真存档;
 *   二 在 390×844 / 375×812 / 320×568 三个宽度下,逐页量 scrollWidth 与越界元素,
 *      并核对**外壳本身**没被滚偏(overflow-hidden 的盒子玩家滚不动,浏览器滚得动);
 *   三 把「底部导航五项」「无 pageerror」「控件都有可访问名」「可点元素不小于 28px」也一并核对;
 *   四 把浏览器存储卡死(令 setItem 抛错),看设置页会不会把「写不进去」说出来 ——
 *      静默丢档是玩家看不见的事故,只能靠这一条端到端核。
 *   五 弹窗的 dialog 语义与焦点(进得去 / 困得住 / 关掉还给触发它的按钮);
 *   六 Tab 焦点看得见(全局 :focus-visible 是否有实际轮廓);
 *   七 浮出来的提示条点得掉 —— 它挂着 @click 关掉自己,不能被外框的
 *      pointer-events:none 继承掉(继承了就永远只能等超时)。
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
  // 390×844 = iPhone 12/13/14/15 的标称宽度,当下最常见的一档;
  // 375/320 是旧机型与极窄档。三档一起量,免得只守住了其中一档。
  // dpr 只影响截图栅格化(1px 边框、字体抗锯齿),不影响 CSS 布局与判据 ——
  // 但 --shots 存下来的图因此更接近真机看到的密度,便于人眼复核。
  { width: 390, height: 844, tag: '390', dpr: 3 },
  { width: 375, height: 812, tag: '375', dpr: 3 },
  { width: 320, height: 568, tag: '320', dpr: 2 }
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

/**
 * 弹窗**里面**的控件也要过页面上那两条尺子:有可访问名、不小于 28px。
 *
 * 逐页巡的那一遍只量得到页面上摆着的东西 —— 弹窗没打开就不存在,于是这两条
 * 判据一直没有覆盖弹窗内部。实测漏掉的有:共享的关闭键(一枚图标、无名、
 * 内外边距加起来 26px,每个弹窗都有它)、纯文字按钮「立契」(18px)、
 * 行内链接(命中区只有字体那 14px)。故这里量弹窗自己。
 */
async function auditModalControls(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.modal-panel')
    if (!panel) return null
    const rows = [...panel.querySelectorAll('button, a, [role=button]')]
      .map(el => {
        const r = el.getBoundingClientRect()
        return {
          name: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14),
          h: Math.round(r.height)
        }
      })
      .filter(r => r.h > 0)
    return {
      count: rows.length,
      unnamed: rows.filter(r => !r.name).map(r => `${r.h}px`),
      small: rows.filter(r => r.h < 28).map(r => `${r.h}px «${r.name || '无名'}»`)
    }
  })
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))

  await page.goto(INDEX, { waitUntil: 'load' })
  // 建号:同意隐私 → 传送门(约 2.5s)→ 命名 → 踏入仙途
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  // 隐私弹窗也是弹窗:它的控件同样要过那两条尺子(页面上巡不到它)
  {
    const audit = await auditModalControls(page)
    checked += 1
    if (!audit || audit.count === 0) failures.push(`[${vp.tag}] 隐私弹窗里一个控件都没数到,判据没跑到东西`)
    if (audit?.unnamed.length) failures.push(`[${vp.tag}] 隐私弹窗里有 ${audit.unnamed.length} 个无名控件`)
    if (audit?.small.length) failures.push(`[${vp.tag}] 隐私弹窗里可点元素过小:${audit.small.join(' | ')}`)
  }
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
        /**
         * 外壳(#app 的第一层)不能被滚偏,也不该有可滚的横向余量。
         *
         * 它是 overflow-hidden 的:玩家滚不动,但**浏览器滚得动**。
         * 云雾装饰故意越界画出盒子(左上 -64px、右下 -96px),曾把外壳撑到
         * scrollWidth 516 vs clientWidth 390;建号结束时浏览器顺手把 scrollLeft
         * 设成 24,此后整个界面永久左移 24px —— 顶栏名字被切掉左半边、底部
         * 第一栏「洞府」只剩半个字。而「查 documentElement 有没有横向溢出」查不出
         * 这件事:overflow-hidden 把子元素的溢出挡在外壳以内,量在最外层永远是绿的。
         * 故这里直接量外壳自己:scrollLeft 必须为 0,且不该有横向可滚区间。
         */
        shellShift: (() => {
          const shell = document.getElementById('app')?.firstElementChild
          if (!shell) return null
          return { scrollLeft: Math.round(shell.scrollLeft), overflowX: Math.round(shell.scrollWidth - shell.clientWidth) }
        })(),
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
    if (info.shellShift && (info.shellShift.scrollLeft !== 0 || info.shellShift.overflowX > 1)) {
      problems.push(`外壳被滚偏(scrollLeft ${info.shellShift.scrollLeft} / 横向可滚 ${info.shellShift.overflowX}px)`)
    }
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

  /*
   * 先把浮出来的提示条收掉再点「关于」。
   *
   * 提示条是浮在顶上的一层(而且现在真的可点),建号后的成就提示会停留两三秒;
   * 它与设置页入口若落在同一区域,这条判据就会被一条无干的提示挡住而假红
   * (实测偶发:waitFor 过了、click 超时)。要测的是弹窗焦点,不是提示条 ——
   * 提示条自己那条判据在下面单独跑。
   */
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
  })
  await page.waitForTimeout(400)

  const trigger = page.getByRole('button', { name: /关于/ }).first()
  // 先等它真的画出来:懒加载的分包 + 页面淡入都要时间,直接点会得到
  // 「点了没反应」的假红(实测偶发),而这条判据要抓的是真问题,不是抢跑
  try {
    await trigger.waitFor({ state: 'visible', timeout: 10000 })
    await trigger.click({ timeout: 5000 })
  } catch (err) {
    // 把真实原因写进报告 —— 「页面没就绪?」这种猜测曾让人白跑一趟
    failures.push(`[375] 弹窗焦点场景:「关于」入口点不开(${String(err).split('\n')[0]?.slice(0, 140)})`)
  }
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

  const inModal = await auditModalControls(page)
  checked += 1
  if (!inModal || inModal.count === 0) failures.push('[375] 弹窗场景:面板里一个控件都没数到,判据没跑到东西')
  if (inModal?.unnamed.length) failures.push(`[375] 弹窗场景:面板里有 ${inModal.unnamed.length} 个无名控件(读屏只会念「按钮」)`)
  if (inModal?.small.length) failures.push(`[375] 弹窗场景:面板里可点元素过小:${inModal.small.join(' | ')}`)

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

// ---- 第六件事:Tab 焦点看得见吗 ----
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('焦点可见自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1200)
  checked += 1

  for (const route of ['/cultivation', '/settings']) {
    await page.evaluate(r => {
      location.hash = `#${r}`
    }, route)
    await page.waitForTimeout(650)
    // 从「没有焦点」的干净状态开始数 Tab,免得把上一页残留的焦点算进来
    await page.evaluate(() => document.activeElement?.blur())
    const seen = []
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body || el === document.documentElement) return { blind: null, label: '(body)' }
        const cs = getComputedStyle(el)
        // 透明的轮廓等于没有 —— 只看「有没有一圈线」会把 outline:transparent 也算通过
        const hiddenOutline = cs.outlineColor === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(cs.outlineColor)
        const ring =
          (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !hiddenOutline) || cs.boxShadow !== 'none'
        const label = `${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12)}»`
        return { blind: ring ? null : label, label }
      })
      seen.push(info.label)
      if (info.blind) failures.push(`[375] ${route} 第 ${i + 1} 个 Tab 落点看不见焦点:${info.blind}`)
    }
    // 落点一个没数到 = 这段判据没跑到东西,也要红
    if (seen.filter(s => s !== '(body)').length === 0) failures.push(`[375] ${route} 的 Tab 落点一个都没数到`)
  }
  if (pageErrors.length) failures.push(`[375] 焦点可见场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

// ---- 第七件事:浮出来的提示条能不能点掉 ----
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)))
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('浮层自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1200)
  const hostSel = '.pointer-events-none.fixed'
  const before = await page.evaluate(sel => {
    const buttons = [...document.querySelectorAll(`${sel} button`)]
    return {
      count: buttons.length,
      // 判据是**计算出来的** pointer-events:外框写 none 时按钮会继承成 none,
      // 于是 @click 挂在那儿却永远收不到事件 —— 写了不生效,等于没写
      blocked: buttons.filter(b => getComputedStyle(b).pointerEvents === 'none').length
    }
  }, hostSel)
  checked += 1
  if (before.count === 0) failures.push('[375] 浮层场景:一条提示都没浮出来,这条判据没跑到东西')
  if (before.blocked > 0) failures.push(`[375] 浮层场景:${before.blocked} 条提示条点了没反应(pointer-events 被外框的 none 继承)`)
  if (before.count > 0 && before.blocked === 0) {
    const first = page.locator(`${hostSel} button`).first()
    const text = ((await first.textContent()) ?? '').trim()
    await first.click({ timeout: 3000 })
    /*
     * 「点了要收」还得看它**多快**收:提示条带 glow-pulse 无限动画时,过渡探测
     * 会把 2.4 秒当成离场时长,点掉之后原地杵两秒才没(实测 460ms 仍在原地)。
     * 故给一个 1 秒的窗口 —— 它短于最短的提示寿命(2.6 秒),不会把「自己超时消失」错认成点掉了。
     */
    let gone = false
    for (let i = 0; i < 20 && !gone; i += 1) {
      await page.waitForTimeout(50)
      gone = (await page.locator(`${hostSel} button`, { hasText: text }).count()) === 0
    }
    if (!gone) failures.push(`[375] 浮层场景:点了「${text.slice(0, 12)}」1 秒内没消失(还挂在屏幕上)`)
  }
  if (pageErrors.length) failures.push(`[375] 浮层场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

await browser.close()
console.log(`\n排版自检:${checked} 个页面 × 视口组合`)
if (failures.length === 0) {
  console.log('✓ 无横向溢出、无越界元素、底部导航五项齐全、控件有名且不小于 28px、选择项有选中态')
  console.log('✓ 提示条点得掉、弹窗焦点与外壳偏移都正常')
  if (SHOTS) console.log(`  截图已存 ${SHOTS_DIR}`)
} else {
  for (const f of failures) console.log(`✗ ${f}`)
  process.exitCode = 1
}
