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
 *   八 引擎按概率触发的两扇弹窗(顿悟 / 洞府巡游):把概率钉成必中再量一遍 ——
 *      它们正常巡页碰不到,正是最容易悄悄退回「自己铺一层浮层」的角落。
 *   九 冷启动落在子页时,「返回」要回父页而不是退出游戏(书签 / deep link /
 *      PWA 恢复上次路由都会走到这个处境)。
 *   十 后期档复核:用夹具存档(神人境 + 装备/法宝/器魂/在途秘境 + 隔夜归来)
 *      再巡一遍 —— 空档量不出长数字与满屏内容,而归来卷轴那屏每几天就见一次。
 *   十一 渡劫突破真打一次:结果弹窗必须写清成败与雷数、成功要与页面境界对得上
 *      (每个玩家反复看的那一屏,此前从没被渲染过)。
 *   十二 走完一次转世(寿元将尽 → 此生已矣 → 轮回 → 新的一世):唯一会把存档
 *      推倒重来的仪式,此前一步都没被真浏览器走过。
 *
 * 判据是「横向溢出」这一类——它正是窄屏上最常见的排版事故。
 * 说明:这是无头 Chromium 的视口模拟,不是真机;字体渲染与安全区(刘海/手势条)
 * 仍需真机确认,故本脚本过绿不等于真机过绿。
 */
import { chromium } from 'playwright'
import CryptoJS from 'crypto-js'
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
      // 对话框自己也得有个名字:读屏遇到 role=dialog 要念得出是哪一扇
      label: (panel.getAttribute('aria-label') || panel.querySelector('h3')?.textContent || '').trim(),
      unnamed: rows.filter(r => !r.name).map(r => `${r.h}px`),
      small: rows.filter(r => r.h < 28).map(r => `${r.h}px «${r.name || '无名'}»`)
    }
  })
}

/**
 * 收集页面异常 —— 只认本项目代码抛的。
 *
 * 站点里挂了一段第三方统计脚本(51.la)。它自己抛的异常与游戏无关,却会把
 * 「无 pageerror」判否掉 —— 实测:把 Math.random 钉成常量(为了确定性地触发
 * 引擎事件)之后,那段脚本会抛 `TypeError: Invalid UUID`,而游戏本身一切正常。
 * 故按堆栈里的脚本来路分流:第三方脚本的异常只打印、不计入失败。
 */
function watchPageErrors(page, sink) {
  let thirdPartyNoted = false
  page.on('pageerror', e => {
    const stack = String(e.stack || e.message || '')
    if (/sdk\.51\.la/.test(stack)) {
      // 逐页重载会把它重复抛出来,同一处只提一次,免得报告被噪声淹没
      if (!thirdPartyNoted) {
        thirdPartyNoted = true
        console.log(`  (第三方统计脚本异常,不计入失败:${String(e.message).slice(0, 60)})`)
      }
      return
    }
    sink.push(String(e).slice(0, 160))
  })
}

/**
 * 把取景收拾干净:收掉提示条、钉死随机事件、关掉已经浮上来的弹窗。
 *
 * 由来:弹窗焦点场景三次偶发假红,真凶每次都是引擎随机浮上来的「悟道顿悟」——
 * 它是一整层遮罩,点它盖着的入口自然点不动。只钉 Math.random 不够:
 * 引擎每秒一拍,从「踏入仙途」到这条场景动手之间已经够它掷出一次了。
 */
async function clearOverlays(page) {
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
    Math.random = () => 1
  })
  /*
   * 关掉**已经浮起来**的浮层,并且等够一轮。
   *
   * 坑在这里:引擎掷出顿悟(每秒一拍)与弹窗自己每秒一次的轮询是两个独立定时器,
   * 事件已经产生、窗还没画出来 —— 这时数 .modal-panel 是 0,当场就收工,
   * 一秒后那扇窗才浮上来,正好盖住要点的入口。故这里固定转六圈(≈2.1 秒):
   * 有窗就按 Esc 收掉,没窗就等着 —— 反正随机源已钉死,等到的只会是**之前那一扇**。
   */
  for (let i = 0; i < 6; i += 1) {
    if ((await page.locator('.modal-panel').count()) > 0) await page.keyboard.press('Escape')
    await page.waitForTimeout(350)
  }
  return page.evaluate(() => [...document.querySelectorAll('.modal-panel')].map(p => (p.querySelector('h3')?.textContent || p.getAttribute('aria-label') || '?').trim()))
}

/**
 * 一页一量:横向溢出、外壳偏移、越界元素、无名控件、过小可点元素、选择组选中态、底部导航项数。
 *
 * 抽成函数是为了让**后期档**那一遍复用同一把尺子 —— 空档量不出长数字与满屏内容,
 * 而两遍若各写一份判据,迟早会分叉成两套标准。
 */
async function measurePage(page) {
  return page.evaluate(() => {
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
}

/** 一页量出来的读数 → 失败清单(两遍巡页共用同一套判据) */
function problemsOf(info) {
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
  return problems
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr })
  const pageErrors = []
  watchPageErrors(page, pageErrors)

  await page.goto(INDEX, { waitUntil: 'load' })
  // 建号:同意隐私 → 传送门(约 2.5s)→ 命名 → 踏入仙途
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  // 隐私弹窗也是弹窗:它的控件同样要过那两条尺子(页面上巡不到它)
  {
    const audit = await auditModalControls(page)
    checked += 1
    if (!audit || audit.count === 0) failures.push(`[${vp.tag}] 隐私弹窗里一个控件都没数到,判据没跑到东西`)
    if (audit && !audit.label) failures.push(`[${vp.tag}] 隐私弹窗没有可访问名(读屏只会念「对话框」)`)
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
    const info = await measurePage(page)
    checked += 1
    const problems = problemsOf(info)
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
  watchPageErrors(page, pageErrors)
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
  watchPageErrors(page, pageErrors)
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
  const stillOpen = await clearOverlays(page)
  if (stillOpen.length) failures.push(`[375] 弹窗焦点场景:动手前还开着浮层 —— ${stillOpen.join('、')}(取景没收拾干净)`)

  const trigger = page.getByRole('button', { name: /关于/ }).first()
  // 先等它真的画出来:懒加载的分包 + 页面淡入都要时间,直接点会得到
  // 「点了没反应」的假红(实测偶发),而这条判据要抓的是真问题,不是抢跑
  try {
    await trigger.waitFor({ state: 'visible', timeout: 10000 })
    await trigger.click({ timeout: 5000 })
  } catch (err) {
    // 把真实原因与**挡路的是谁**一起写进报告 —— 「页面没就绪?」这种猜测曾让人白跑两趟,
    // 第二次才发现挡路的是一层随机浮上来的浮盖。抓不到线索的判据等于没有判据。
    const blocked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').includes('关于'))
      if (!b) return '(页面上找不到「关于」)'
      const r = b.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      const modals = [...document.querySelectorAll('.modal-panel')].map(p => (p.querySelector('h3')?.textContent || '(无标题)').trim())
      return `挡路:${at ? `${at.tagName.toLowerCase()}.${String(at.className).slice(0, 40)}` : '无'} / 开着的弹窗:${modals.join('、') || '无'}`
    })
    failures.push(`[375] 弹窗焦点场景:「关于」入口点不开(${String(err).split('\n')[0]?.slice(0, 80)};${blocked})`)
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
  if (inModal && !inModal.label) failures.push('[375] 弹窗场景:对话框没有可访问名(读屏只会念「对话框」)')
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
  watchPageErrors(page, pageErrors)
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
  watchPageErrors(page, pageErrors)
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

// ---- 第八件事:引擎按概率触发的两扇弹窗(顿悟 / 洞府巡游) ----
/*
 * 这两扇由引擎自己掷概率弹出(顿悟 8% × 境界存在感、巡游每日一次),
 * 正常巡页永远碰不到;而它们此前是自己铺的 fixed inset-0,没有 dialog 语义、
 * 没有焦点管理。故这里把 Math.random 钉成 0 让那一掷必中 —— 下一次引擎心跳
 * 就会摆上来,然后按弹窗那套尺子量一遍。夹具只作用于测试页,不动生产代码
 * (注意 RandomService 在构造时就抓住了 Math.random 的函数引用,故引擎其余部分
 * 的随机数不受影响)。
 */
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await page.locator('input[type=checkbox]').first().check()
  await page.getByRole('button', { name: /同意并开始/ }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('input:not([type=file]):not([type=checkbox])').first().fill('引擎事件自检')
  await page.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
    Math.random = () => 0
  })
  const seen = new Map()
  for (let i = 0; i < 40 && seen.size < 2; i += 1) {
    await page.waitForTimeout(500)
    const info = await page.evaluate(() => {
      const panel = document.querySelector('.modal-panel')
      if (!panel) return null
      return {
        title: (panel.querySelector('h3')?.textContent || '').trim() || '(无标题)',
        label: panel.getAttribute('aria-label'),
        role: panel.getAttribute('role'),
        controls: [...panel.querySelectorAll('button, a, [role=button]')]
          .map(el => ({ name: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14), h: Math.round(el.getBoundingClientRect().height) }))
          .filter(c => c.h > 0)
      }
    })
    if (info && !seen.has(info.title)) {
      seen.set(info.title, info)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
    }
  }
  checked += 1
  if (seen.size === 0) failures.push('[375] 引擎事件场景:概率钉成必中之后,两扇弹窗一扇都没浮出来(触发接线断了?)')
  for (const [title, info] of seen) {
    if (info.role !== 'dialog') failures.push(`[375] 「${title}」没有 dialog 语义(role=${info.role})`)
    if (!info.label) failures.push(`[375] 「${title}」没有可访问名`)
    const bad = info.controls.filter(c => !c.name || c.h < 28)
    if (bad.length) failures.push(`[375] 「${title}」里有 ${bad.length} 个控件不合格:${bad.map(c => `${c.h}px «${c.name || '无名'}»`).join(' | ')}`)
  }
  if (pageErrors.length) failures.push(`[375] 引擎事件场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await page.close()
}

// ---- 第九件事:冷启动落在子页时,「返回」不该把人送出游戏 ----
/*
 * 书签、外部 deep link、PWA 冷启动恢复上次路由,都会让**第一次**导航就落在
 * 子页上;此时站内没有上一页,裸 router.back() 会退到 about:blank ——
 * 实测整个界面连同这一局的上下文一起消失,而玩家只觉得「点了一下返回,游戏没了」。
 * 复现要用同一 context 里新开的一页:它共享存档(localStorage),但历史是全新的。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const boot = await ctx.newPage()
  await boot.goto(INDEX, { waitUntil: 'load' })
  await boot.getByRole('button', { name: /开\s*始\s*游\s*戏/ }).first().click()
  await boot.locator('input[type=checkbox]').first().check()
  await boot.getByRole('button', { name: /同意并开始/ }).first().click()
  await boot.waitForTimeout(3200)
  await boot.locator('input:not([type=file]):not([type=checkbox])').first().fill('返回自检')
  await boot.getByRole('button', { name: /踏\s*入\s*仙\s*途/ }).first().click()
  await boot.waitForTimeout(1200)
  await boot.close()

  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  // 这一页的第一次导航就是子页 —— 正是冷启动的处境
  await page.goto(INDEX + '#/dongfu', { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  // 同上:别让随机浮上来的引擎事件挡住「返回」
  await clearOverlays(page)
  checked += 1
  const coldBack = await page.evaluate(() => ({
    back: (window.history.state || {}).back ?? null,
    hasBack: !!document.querySelector('main button')
  }))
  if (coldBack.back) failures.push(`[375] 冷启动场景:第一次导航就落在子页,history.state.back 竟是 ${coldBack.back}(复现条件没搭对)`)
  const backBtn = page.locator('main button', { hasText: /返\s*回/ }).first()
  if ((await backBtn.count()) === 0) {
    failures.push('[375] 冷启动场景:子页上没有「返回」入口,判据没跑到东西')
  } else {
    await backBtn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(900)
    const after = await page.evaluate(() => ({
      hash: location.hash,
      alive: !!document.querySelector('#app')?.firstElementChild
    }))
    if (!after.alive) failures.push('[375] 冷启动场景:点「返回」把游戏退出了(界面没了,退到站外)')
    else if (after.hash !== '#/' && after.hash !== '') failures.push(`[375] 冷启动场景:点「返回」落在 ${after.hash},父页应是 #/`)
  }
  if (pageErrors.length) failures.push(`[375] 冷启动场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十件事:后期档的逐页复核(空档量不出长数字与满屏内容) ----
/*
 * 前面九件事量的是「刚建号」那一份空档。可同一个页面在神人境是另一副样子:
 * 数字长到九位数、法宝两件、器魂、在途秘境、以及隔夜归来时的「归来卷轴」。
 * 那一屏玩家每隔几天就会见一次,却从来没有被无头浏览器画出来过。
 * 故这里用一份自检夹具(存档密钥就写在包里,见 utils/crypto 的注释:并非安全边界),
 * 走一遍后期档:先核归来卷轴,再逐页过同一把尺子。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now() - 86400000 * 30, lastActiveAt: Date.now() - 9 * 3600000, totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: {
      major: 14,
      sub: 0,
      exp: gn(3, 9),
      age: 3000,
      lifespanBonusYears: 0,
      dead: false,
      reincarnation: { count: 2, daoFruit: 12, talents: [], insight: 400, lives: [], vow: null, trial: null, bonds: [] },
      linggen: { roots: [{ element: 'fire', aptitude: 88 }, { element: 'water', aptitude: 70 }], gradeName: '双灵根', growthMult: 1.4 },
      // 在途秘境:归来卷轴要说「原样留着」,历练页也要画出「在境中」那一版
      secretRealm: { realmId: 'sr_kurong', enteredAt: Date.now() - 600000, layer: 2, wins: 1, losses: 0, spoils: ['灵石少许'], rules: ['治疗减半'], carriedHpPct: 0.7, finished: false }
    },
    resources: { spiritStone: gn(9, 12), qi: 5000, wudao: 800, herb: 900, ore: 900, page: 300, dust: 500 },
    inventory: {
      items: [
        { uid: 'late_w', templateId: 'w_zidian', quality: 'heaven', tier: 20, level: 0, affixes: [{ id: 'bs3', roll: 1 }] },
        { uid: 'late_a', templateId: 'a_hufu', quality: 'heaven', tier: 20, level: 0, affixes: [{ id: 'low2', roll: 1 }] }
      ],
      equipped: { weapon: 'late_w', armor: 'late_a' },
      pills: { p_jvqidan: 5, p_huichun: 3 },
      artifacts: [{ defId: 'af_qinglian', level: 3 }, { defId: 'af_wuxiangzhu', level: 2 }],
      equippedArtifacts: ['af_qinglian', 'af_wuxiangzhu']
    },
    endgame: {
      daoPath: 'sword',
      daoSource: 1200,
      souls: [{ uid: 'late_s1', type: 'fengmang', grade: 1, fromName: '旧剑' }],
      equippedSouls: ['late_s1'],
      // 在途远征:归来卷轴要说「原样留着」,天界页也要画出「走到第二重」那一版
      worldRun: {
        worldId: 'chiyan',
        pactId: null,
        gateId: null,
        layer: 1,
        bonus: 12,
        rows: [{ foeName: '焰魄', win: true, rounds: 7, hpLeftPct: 0.62 }],
        carriedHpPct: 0.62,
        totalRounds: 7,
        winStacks: 1
      }
    },
    settings: {
      privacyAccepted: true,
      sfxOn: false,
      musicOn: false,
      musicVol: 0,
      sfxVol: 0,
      reduceMotion: true,
      battleSpeed: 4,
      decomposeRanks: [],
      smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true },
      theme: 'dark'
    }
  }
  await ctx.addInitScript(
    data => {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.waitForTimeout(2600)

  // (一)隔夜归来第一眼:数字不许漏 NaN,收下之后要真的关掉
  checked += 1
  const offline = await page.evaluate(() => {
    const panel = document.querySelector('.modal-panel')
    if (!panel) return null
    const text = panel.innerText || ''
    return {
      label: panel.getAttribute('aria-label'),
      text: text.slice(0, 200),
      leaks: /NaN|undefined|Infinity/.test(text),
      rows: text.split('\n').filter(l => l.includes('+')).length
    }
  })
  if (!offline) {
    failures.push('[390] 后期档:隔夜 9 小时开局,「归来卷轴」没有弹出来')
  } else {
    if (!offline.label) failures.push('[390] 后期档:归来卷轴没有可访问名')
    if (offline.leaks) failures.push(`[390] 后期档:归来卷轴漏出占位符 —— ${offline.text.slice(0, 60)}`)
    if (offline.rows === 0) failures.push('[390] 后期档:归来卷轴一条收益都没列')
    const take = page.locator('.modal-panel button', { hasText: /收\s*下/ }).first()
    if ((await take.count()) === 0) failures.push('[390] 后期档:归来卷轴没有「收下」')
    else {
      await take.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(700)
      if (await page.locator('.modal-panel').count()) failures.push('[390] 后期档:点了「收下」归来卷轴没关掉')
    }
  }

  // (二)后期档逐页:与空档同一把尺子
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
    Math.random = () => 1
  })
  await page.waitForTimeout(400)
  for (const route of ['/', '/cultivation', '/adventure', '/inventory', '/character', '/celestial', '/souls', '/collection', '/build', '/dongfu']) {
    await page.goto(INDEX + '#' + route, { waitUntil: 'load' })
    await page.waitForTimeout(700)
    const info = await measurePage(page)
    checked += 1
    const problems = problemsOf(info)
    if (problems.length) failures.push(`[390-late] ${route} → ${problems.join(' / ')}`)
  }

  /*
   * (三)在途秘境要真的推得动。
   *
   * 秘境这一整套此前只在单元用例里跑过 —— 界面上「再入一层」按下去会怎样,
   * 从没有人看过:点了没反应、刷不出战报、数字漏 NaN,都会静静留在这里。
   * 夹具身上带着一趟打到第二层的秘境,故这里真点一次:要么浮出战报,
   * 要么卡片状态前移(层数/败次/探尽),两者必有其一。
   */
  await page.goto(INDEX + '#' + '/adventure', { waitUntil: 'load' })
  await page.waitForTimeout(800)
  checked += 1
  const beforeText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
  const fightAgain = page.locator('main button', { hasText: /再\s*入\s*一\s*层/ }).first()
  if ((await fightAgain.count()) === 0) {
    failures.push('[390-late] 历练页:在途秘境没有「再入一层」入口 —— 夹具的秘境没被读出来?')
  } else {
    await fightAgain.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(900)
    const after = await page.evaluate(() => ({
      text: document.querySelector('main')?.innerText || '',
      toasts: [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim())
    }))
    if (after.toasts.length === 0 && after.text === beforeText) {
      failures.push('[390-late] 历练页:点了「再入一层」既没战报也没变化(点了没反应)')
    }
    if (/NaN|undefined/.test(after.text + after.toasts.join(' '))) failures.push('[390-late] 历练页:秘境推进后漏出占位符')
    console.log(
      `  在途秘境推进一步:${after.toasts.length ? `战报「${after.toasts[0]?.slice(0, 26)}」` : '卡片状态前移'}` +
        `${after.toasts.length > 1 ? ` 等 ${after.toasts.length} 条` : ''}`
    )
  }
  if (pageErrors.length) failures.push(`[390] 后期档页面异常:${[...new Set(pageErrors)].join(' | ')}`)

  /*
   * (四)在途远征也要真的走得动。
   *
   * 与秘境同理:远征这一套只在单元用例里跑过,界面上「第 N 重择路」按下去会怎样,
   * 从没有人看过。夹具身上带着一趟打到第二重的赤炎天远征(天界页会直接开在远征册上),
   * 故这里真点一次择路:要么浮出战报、要么行程点列前移,并查占位符与页面异常。
   */
  await page.goto(INDEX + '#' + '/celestial', { waitUntil: 'load' })
  await page.waitForTimeout(900)
  checked += 1
  const runBefore = await page.evaluate(() => document.querySelector('main')?.innerText || '')
  /*
   * 入口怎么认:两条路各自的按钮上写着「道源 +N」(层号那行是独立的文本,不在按钮里);
   * 若这一趟已经走到界主,入口换成「决战」。两者必有其一 —— 都找不到就是真没入口。
   */
  const pickNode = page.locator('main button', { hasText: /道源 \+\d+/ }).first()
  const runEntry = (await pickNode.count()) > 0 ? pickNode : page.locator('main button', { hasText: /决\s*战/ }).first()
  if (!/远征 ·/.test(runBefore)) {
    failures.push('[390-late] 天界页:在途远征没有渲染出来(夹具的 worldRun 没被读出来?)')
  } else if ((await runEntry.count()) === 0) {
    failures.push('[390-late] 天界页:在途远征没有可推进一步的入口(既无择路也无决战)')
  } else {
    const clicked = ((await runEntry.textContent()) || '').replace(/\s+/g, ' ').trim().slice(0, 18)
    await runEntry.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(900)
    const after = await page.evaluate(() => ({
      text: document.querySelector('main')?.innerText || '',
      toasts: [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()),
      // 打输会开战报弹窗(赢了只是行程点列前移,不开弹窗)
      report: (document.querySelector('.modal-panel h3')?.textContent || '').trim()
    }))
    if (!after.report && after.toasts.length === 0 && after.text === runBefore) {
      failures.push('[390-late] 天界页:点了远征的推进入口既没战报也没变化(点了没反应)')
    }
    /*
     * 开出来的战报必须**叫得出这一界**:标题得在动手前取。
     * 从前先打后读 runWorld,而收尾那一场会把 worldRun 清空,标题就退成「远征」。
     */
    if (after.report && after.report !== '赤炎天') {
      failures.push(`[390-late] 天界页:远征战报弹窗标题是「${after.report}」,应为这一界的名字(赤炎天)`)
    }
    if (/NaN|undefined/.test(after.text + after.toasts.join(' ') + after.report)) failures.push('[390-late] 天界页:远征推进一步后漏出占位符')
    console.log(
      `  在途远征推进一步(点了「${clicked}」):` +
        (after.report ? `战报弹窗「${after.report}」` : after.toasts.length ? `战报「${after.toasts[0]?.slice(0, 24)}」` : '行程点列前移')
    )
  }
  if (pageErrors.length) failures.push(`[390] 后期档页面异常(远征):${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十一件事:渡劫突破真打一次(一局里最要紧的那一屏,此前没人画过) ----
/*
 * 突破结果弹窗(成功/失败、渡劫雷数与「寿元增至」那一行)是每个玩家都会反复看的屏,
 * 而它从来没被无头浏览器渲染过 —— 空档修为不满,按钮是灰的;后期档又未必卡在大关上。
 * 故另起一份「炼气圆满」的夹具:修为与灵气给足、寿元留够,点「引 劫 突 破」真打一次。
 * 渡劫成不成是随机的,故判据只看**形状**:必须开出结果弹窗,写清成败与境界去向,
 * 失败不许漏占位符,成功要与页面上的境界对得上。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    // 炼气·圆满(大关)+ 修为灵气给足 + 寿元留够(寿元已尽会被「寿元将尽」截住)
    player: { major: 0, sub: 9, exp: gn(9, 30), age: 16, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 30, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'fire', aptitude: 90 }], gradeName: '单灵根', growthMult: 1.2 } },
    resources: { spiritStone: gn(3, 6), qi: 9999999, wudao: 300, herb: 400, ore: 400, page: 90, dust: 120 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX + '#' + '/cultivation', { waitUntil: 'load' })
  await page.waitForTimeout(2200)
  await clearOverlays(page)
  checked += 1
  const tribBtn = page.locator('main button', { hasText: /引\s*劫\s*突\s*破/ }).first()
  if ((await tribBtn.count()) === 0) {
    failures.push('[390] 渡劫场景:修为灵气给足、卡在炼气圆满,却没出现「引劫突破」(判据没跑到东西)')
  } else {
    await tribBtn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(1600)
    const view = await page.evaluate(() => {
      // 只认**突破结果**那一扇:屏幕上可能同时浮着别的(顿悟/巡游),拿错扇就诊断错人
      const panels = [...document.querySelectorAll('.modal-panel')]
      const panel = panels.find(p => /突破成功|突破失败/.test(p.innerText || '')) ?? null
      const text = panel?.innerText || ''
      return {
        found: !!panel,
        // 没开出来时,把「此刻开着的到底是谁」写进报告 —— 上一次注入就是靠这句才能一眼看懂
        others: panels.map(p => (p.querySelector('h3')?.textContent || p.getAttribute('aria-label') || '无标题').trim()).join('、'),
        text,
        label: panel?.getAttribute('aria-label') ?? null,
        outcome: /突破成功/.test(text) ? '成功' : /突破失败/.test(text) ? '失败' : null,
        hasWave: /共\s*\d+\s*道/.test(text),
        // 页面上当前境界(成功之后应当已经换名)
        realm: (document.body.innerText.match(/炼气|筑基/) || [''])[0]
      }
    })
    if (!view.found) failures.push(`[390] 渡劫场景:点了「引劫突破」没有开出结果弹窗(此刻开着的是:${view.others || '无'})`)
    if (view.found) {
      if (!view.outcome) failures.push(`[390] 渡劫场景:结果弹窗没写清成败 —— ${view.text.slice(0, 40)}`)
      if (!view.hasWave) failures.push('[390] 渡劫场景:渡劫结果里没有雷数(「共 N 道」)')
      if (/NaN|undefined|Infinity/.test(view.text)) failures.push('[390] 渡劫场景:结果弹窗漏出占位符')
      if (view.outcome === '成功' && view.realm !== '筑基') {
        failures.push(`[390] 渡劫场景:弹窗说成功,页面上的境界却还是「${view.realm}」`)
      }
      const close = page.locator('.modal-panel button', { hasText: /继续问道|收拾心情/ }).first()
      if ((await close.count()) === 0) failures.push('[390] 渡劫场景:结果弹窗没有收尾按钮')
      else {
        await close.click({ timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(600)
        if (await page.locator('.modal-panel').count()) failures.push('[390] 渡劫场景:点了收尾按钮弹窗没关掉')
      }
    }
    console.log(`\n渡劫突破:${view.outcome ?? '(没写成败)'} · 雷数${view.hasWave ? '有' : '缺'} · 页面境界 ${view.realm}`)
  }
  if (pageErrors.length) failures.push(`[390] 渡劫场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十二件事:走完一次转世(寿元将尽 → 此生已矣 → 轮回 → 新的一世) ----
/*
 * 转世是每一世收官的那套仪式,也是**唯一会把存档推倒重来**的流程 ——
 * 三步弹窗 + 择姿立题 + 新的一世,此前一步都没被真浏览器走过。
 * 夹具把寿元写尽(一读档引擎就判定身故),然后一路点下去。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now() - 86400000 * 60, lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: {
      major: 5,
      sub: 3,
      exp: gn(2, 7),
      age: 99999,
      lifespanBonusYears: 0,
      dead: false,
      reincarnation: { count: 1, daoFruit: 9, talents: [], insight: 120, lives: [], vow: null, trial: null, bonds: [] },
      linggen: { roots: [{ element: 'fire', aptitude: 90 }], gradeName: '单灵根', growthMult: 1.2 }
    },
    resources: { spiritStone: gn(4, 6), qi: 4000, wudao: 500, herb: 300, ore: 300, page: 60, dust: 80 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.waitForTimeout(2600)

  /** 读一扇弹窗的形状:标题、正文、按钮、有没有漏占位符 */
  const readPanel = () =>
    page.evaluate(() => {
      const p = document.querySelector('.modal-panel')
      if (!p) return null
      return {
        title: (p.querySelector('h3')?.textContent || p.getAttribute('aria-label') || '').trim(),
        text: (p.innerText || '').replace(/\n+/g, ' '),
        buttons: [...p.querySelectorAll('button')].map(b => (b.textContent || '').trim())
      }
    })
  const step = async (label, expect) => {
    checked += 1
    const p = await readPanel()
    if (!p) {
      failures.push(`[390] 转世场景:${label}没有弹出对应的窗`)
      return null
    }
    if (!expect.test(p.title)) failures.push(`[390] 转世场景:${label}的窗标题是「${p.title}」,不是预期的${expect}`)
    if (/NaN|undefined|Infinity/.test(p.text)) failures.push(`[390] 转世场景:${label}漏出占位符 —— ${p.text.slice(0, 50)}`)
    return p
  }

  const death = await step('读档后(身故)', /寿元将尽/)
  if (death && !/兵解转世/.test(death.buttons.join(' '))) failures.push('[390] 转世场景:身故那屏没有「兵解转世」')
  await page.locator('.modal-panel button', { hasText: /兵\s*解\s*转\s*世/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(900)

  const review = await step('兵解后(回顾)', /此生已矣/)
  if (review && !/宿慧/.test(review.text)) failures.push('[390] 转世场景:回顾那一程没有交代宿慧')
  await page.locator('.modal-panel button', { hasText: /往\s*生/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(800)

  const next = await step('往生后(择姿立题)', /轮回/)
  if (next && !/道果/.test(next.text)) failures.push('[390] 转世场景:轮回那一程没有交代道果')
  // 有先天之姿就先择一个(不择则「踏入轮回」是灰的)
  const talent = page.locator('.modal-panel button').first()
  if (next && next.buttons.some(b => /赋|姿/.test(b))) await talent.click({ timeout: 3000 }).catch(() => {})
  const confirm = page.locator('.modal-panel button', { hasText: /踏\s*入\s*轮\s*回/ }).first()
  if ((await confirm.count()) === 0) failures.push('[390] 转世场景:轮回那程没有「踏入轮回」')
  else {
    if (await confirm.isDisabled()) failures.push('[390] 转世场景:择了先天之姿,「踏入轮回」仍是灰的')
    await confirm.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(1800)
    const after = await page.evaluate(() => ({
      modal: !!document.querySelector('.modal-panel'),
      text: (document.querySelector('main')?.innerText || '').replace(/\n+/g, ' ').slice(0, 200)
    }))
    if (after.modal) failures.push('[390] 转世场景:点「踏入轮回」之后还留着一扇没关的弹窗')
    if (/炼虚|99999/.test(after.text)) failures.push('[390] 转世场景:转世之后页面上还写着上一世的境界/寿数')
    console.log(`\n转世:${[death?.title, review?.title, next?.title].filter(Boolean).join(' → ')} → 新的一世(${after.text.slice(0, 24)}…)`)
  }
  if (pageErrors.length) failures.push(`[390] 转世场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

await browser.close()
console.log(`\n排版自检:${checked} 个页面 × 视口组合`)
if (failures.length === 0) {
  console.log('✓ 无横向溢出、无越界元素、底部导航五项齐全、控件有名且不小于 28px、选择项有选中态')
  console.log('✓ 提示条点得掉、弹窗焦点与外壳偏移正常、引擎事件弹窗也过同一套尺子')
  if (SHOTS) console.log(`  截图已存 ${SHOTS_DIR}`)
} else {
  for (const f of failures) console.log(`✗ ${f}`)
  process.exitCode = 1
}
