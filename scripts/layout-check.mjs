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
 *   十三 挂机玩法真的在挂着跑:顶栏灵气只给 1 点,真等两轮看它自己涨不涨 ——
 *      「应用启动后引擎有没有跑起来」只有真浏览器能答。
 *   十四 存档往返:导出 → 投灵脉花掉灵石 → 导入回来,必须回到导出那一刻
 *      (最后一道保险,此前没人按过这两个按钮)。
 *   十五 后期档再走一遍 320 窄屏:「长数字 + 满屏内容 + 最窄屏」这个组合
 *      此前没量过(主巡页的 320 用的是刚建号的空档)。
 *   十六 坏档开局:坏掉一个分片也要进得去,并且说得出「哪一片坏了、原档在哪」。
 *   十七 导出失败也要说话:把浏览器的下载能力打断再点一次「导出存档」。
 *   十八 切后台/离开页面时,待刷的存档要立刻落盘(visibilitychange / pagehide)。
 *   十九 真打一场历练战斗:战报回放要出内容、结语要写清胜负、战斗分析点得开。
 *   二十 背包里的账目:强化写着扣多少尘就扣多少,分解说给多少尘就给多少。
 *   二十一 闭关期间不许历练:点出发要当场拦下(不开模式窗),换页回来闭关还在。
 *   二十二 减少动效真的减到了(并顺带在音效开着的情况下点一路按钮)。
 *   二十三 洞府营造的账目:卡片写多少石就扣多少石。
 *
 * 判据是「横向溢出」这一类——它正是窄屏上最常见的排版事故。
 * 说明:这是无头 Chromium 的视口模拟,不是真机;字体渲染与安全区(刘海/手势条)
 * 仍需真机确认,故本脚本过绿不等于真机过绿。
 */
import { chromium } from 'playwright'
import CryptoJS from 'crypto-js'
import { mkdirSync, rmSync } from 'node:fs'
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

/** 把 formatGN 渲染出来的文本还原成数值(万/亿/兆…按 10^4 递进) */
async function readFormatted(page, title) {
  return page.evaluate(t => {
    const el = document.querySelector(`[title="${t}"]`)
    if (!el) return { text: `(找不到 ${t})`, value: null }
    const text = (el.textContent || '').trim().replace(/,/g, '')
    const UNITS = ['万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极']
    const m = /([\d][\d]*(?:\.\d+)?)\s*(万|亿|兆|京|垓|秭|穰|沟|涧|正|载|极)?/.exec(text)
    if (!m) return { text, value: null }
    const unit = m[2] ? Math.pow(10, 4 * (UNITS.indexOf(m[2]) + 1)) : 1
    return { text, value: parseFloat(m[1]) * unit }
  }, title)
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
       * 禁用按钮上的字也得读得出来。
       *
       * 禁用态往往正是「为什么不让我点」那句(「修为未至圆满」「灵石不足」),
       * 而它此前用最淡的 ink-ghost 打底 + 75% 白字 —— 实测对比度 1.79:1,
       * 在手机上基本看不见。这里量的是**算出来的**前景/背景对比度(两条都是不透明色)。
       */
      dimDisabled: [...document.querySelectorAll('.btn-seal:disabled, .btn-ghost:disabled')]
        .map(el => {
          const cs = getComputedStyle(el)
          const lum = c => {
            const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c)
            if (!m) return null
            const f = v => {
              const s = v / 255
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
            }
            return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3])
          }
          const lf = lum(cs.color)
          const lb = lum(cs.backgroundColor)
          if (lf === null || lb === null) return null
          const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05)
          return { ratio: Math.round(ratio * 100) / 100, text: (el.textContent || '').trim().slice(0, 12) }
        })
        .filter(x => x && x.ratio < 3)
        .slice(0, 3)
        .map(x => `${x.ratio}:1 «${x.text}»`),
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
  if (info.dimDisabled.length) problems.push(`禁用态的字读不出来(对比度不足):${info.dimDisabled.join(' | ')}`)
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
  // 夹具 payload 只做一次,后面 320 那一遍复用;播种加闸(见第十四件事的坑)
  const latePayload = Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  await ctx.addInitScript(decisivePayload => {
    if (localStorage.getItem('__layoutSeeded')) return
    for (const [k, v] of Object.entries(decisivePayload)) localStorage.setItem(k, v)
    localStorage.setItem('__layoutSeeded', '1')
  }, latePayload)
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

  /*
   * (四续)天道试炼:第三条终局产线,同样只在单元用例里跑过。
   * 切到「试炼」册,真按一次应试,要求开出战报、且写清止步/功成与赏格、不漏占位符。
   */
  await page.goto(INDEX + '#' + '/celestial', { waitUntil: 'load' })
  await page.waitForTimeout(900)
  // 上一步的远征战报还开着(它是一层遮罩),先收掉再切册 —— 否则点不动、还查不出原因
  const leftover = await clearOverlays(page)
  if (leftover.length) failures.push(`[390-late] 天界页:切试炼册前还开着浮层 —— ${leftover.join('、')}`)
  const trialTab = page.getByRole('tab', { name: /试\s*炼/ }).first()
  if ((await trialTab.count()) === 0) failures.push('[390-late] 天界页:找不到「试炼」册')
  else {
    await trialTab.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(500)
    checked += 1
    const trialBtn = page.locator('main button', { hasText: /应\s*试/ }).first()
    if ((await trialBtn.count()) === 0) failures.push('[390-late] 试炼册里没有「应试」入口(判据没跑到东西)')
    else {
      const trialName = ((await trialBtn.textContent()) || '').replace(/\s+/g, ' ').trim().slice(0, 20)
      await trialBtn.click({ timeout: 4000 }).catch(() => {})
      await page.waitForTimeout(2200)
      const after = await page.evaluate(() => {
        const panel = document.querySelector('.modal-panel')
        const text = panel?.innerText || ''
        return {
          title: (panel?.querySelector('h3')?.textContent || '').trim(),
          text: text.replace(/\n+/g, ' ').slice(0, 90),
          rows: panel ? panel.querySelectorAll('p, li').length : 0,
          leaks: /NaN|undefined|Infinity/.test(text)
        }
      })
      if (!after.title) failures.push(`[390-late] 试炼:点了「${trialName}」没有开出战报`)
      else {
        // 战报的两种口径:全捷(打通)或止步第 N 战
        if (!/全捷|止步第/.test(after.text)) failures.push(`[390-late] 试炼:战报没写清结果 —— ${after.text}`)
        if (after.leaks) failures.push('[390-late] 试炼:战报漏出占位符')
        console.log(`  天道试炼(点了「${trialName}」):战报「${after.title}」· ${after.text.slice(0, 34)}…`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      }
    }
  }
  if (pageErrors.length) failures.push(`[390] 后期档页面异常(试炼):${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()

  /*
   * (五)同一份后期档在 320 窄屏再过一遍。
   *
   * 主巡页在 320 量的是刚建号的空档(数字短、内容少);「长数字 + 满屏内容 + 最窄屏」
   * 这个组合此前没量过,而这正是最容易撑破的地方(实测当前全绿,故这一条是防回归)。
   */
  {
    const narrow = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await narrow.addInitScript(decisivePayload => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(decisivePayload)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    }, latePayload)
    const p = await narrow.newPage()
    const errs = []
    watchPageErrors(p, errs)
    await p.goto(INDEX, { waitUntil: 'load' })
    await p.waitForTimeout(2400)
    await clearOverlays(p)
    for (const route of ROUTES) {
      await p.goto(INDEX + '#' + route, { waitUntil: 'load' })
      await p.waitForTimeout(600)
      const info = await measurePage(p)
      checked += 1
      const problems = problemsOf(info)
      if (problems.length) failures.push(`[320-late] ${route} → ${problems.join(' / ')}`)
    }
    if (errs.length) failures.push(`[320] 后期档页面异常:${[...new Set(errs)].join(' | ')}`)
    await narrow.close()
  }
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
  /*
   * 钉死随机源、收掉提示条 —— 但**不要**去关弹窗:这一屏正开着「寿元将尽」,
   * 它就是本场景的起点(而且它故意不可关)。钉随机的用意是免得引擎在转世途中
   * 掷出一个顿悟/巡游浮层,把「关没关干净」的判据搅红(实测偶发)。
   */
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
    Math.random = () => 1
  })
  await page.waitForTimeout(400)

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
      // 判据是「转世那几扇窗关干净了」,不是「一扇窗都没有」——新的一世里
      // 引擎随时可能浮出顿悟/巡游,那是正常玩法,不该被算作转世没走完
      rebirthStillOpen: [...document.querySelectorAll('.modal-panel')]
        .map(p => (p.querySelector('h3')?.textContent || p.getAttribute('aria-label') || '').trim())
        .filter(t => /寿元将尽|此生已矣|轮回/.test(t)),
      text: (document.querySelector('main')?.innerText || '').replace(/\n+/g, ' ').slice(0, 200)
    }))
    if (after.rebirthStillOpen.length) failures.push(`[390] 转世场景:点「踏入轮回」之后还留着转世的窗 —— ${after.rebirthStillOpen.join('、')}`)
    if (/炼虚|99999/.test(after.text)) failures.push('[390] 转世场景:转世之后页面上还写着上一世的境界/寿数')
    console.log(`\n转世:${[death?.title, review?.title, next?.title].filter(Boolean).join(' → ')} → 新的一世(${after.text.slice(0, 24)}…)`)
  }
  if (pageErrors.length) failures.push(`[390] 转世场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十三件事:挂机游戏真的在挂着跑(页面上的数自己在涨) ----
/*
 * 引擎每秒推进修为、灵气与洞府产出 —— 这是放置玩法的根,可此前没有被端到端看过一眼:
 * 单元用例直接调引擎,而「应用启动之后引擎到底跑起来没有」只有真浏览器能答。
 * 若哪天 engine.start() 被条件挡住、或 tick 被谁掐了,界面会安静地冻在那里,
 * 而所有单测照样全绿。故这里真等两轮:灵气只给 1 点,看它自己涨不涨。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: {
      major: 5,
      sub: 3,
      exp: gn(1, 2),
      age: 40,
      lifespanBonusYears: 0,
      dead: false,
      reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] },
      linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 }
    },
    resources: { spiritStone: gn(1, 5), qi: 1, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
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
  await page.waitForTimeout(2200)
  await clearOverlays(page)
  checked += 1
  /** 读顶栏灵气:文本按 formatGN 的档位(万/亿/兆…)还原成数值 */
  const readQi = () => readFormatted(page, '灵气')
  const first = await readQi()
  await page.waitForTimeout(3200)
  const second = await readQi()
  await page.waitForTimeout(3200)
  const third = await readQi()
  const nums = [first.value, second.value, third.value]
  if (nums.some(v => v === null || !Number.isFinite(v))) {
    failures.push(`[390] 挂机场景:顶栏灵气读数解析不出来 —— ${[first, second, third].map(x => x.text).join(' / ')}`)
  } else if (!(nums[2] > nums[0] && nums[0] <= nums[1] && nums[1] <= nums[2])) {
    // 判据是「一直在涨、至少涨了一截」——不要求每步都严格变大:灵气涨到上限会平下来
    failures.push(`[390] 挂机场景:灵气没有在涨(页面上的数冻住了 —— 引擎没跑?) ${nums.join(' → ')}`)
  } else {
    console.log(`\n挂机 6 秒:灵气 ${first.text} → ${second.text} → ${third.text}(页面上的数自己在涨)`)
  }
  if (pageErrors.length) failures.push(`[390] 挂机场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十四件事:导出 → 改动 → 导入回来(存档备份这条路真的走得通吗) ----
/*
 * 「存档只在本地」是这个游戏反复向玩家交代的一条(设置页也这么写),故「导出备份、
 * 事后导入救回来」是最后一道保险。单元用例测过 payload 的形状,却没人真按过这两个按钮:
 * 下载走的是 Blob + a[download],导入走 FileReader + 校验 + 写盘 + 重载,
 * 任何一环断了,玩家都要等到真丢档那天才知道。
 *
 * 判据用**不会自己变的数**(灵石;夹具里没有洞府产出):
 *   导出时的灵石 S0 → 投一点灵脉把灵石花掉(S1 < S0)→ 导入 → 必须回到 S0。
 *
 * 坑记一笔:这种会触发重载的场景,夹具**必须只种一次**
 * (addInitScript 每次导航都会跑,不加闸就会在重载时把刚导入的存档盖回夹具 —— 实测踩过)。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '存读自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  const savePath = '/tmp/layout-roundtrip.save'
  /** 磁盘上那一份灵石(解密 resources 分片;GNum 是 m×10^e) */
  const storedStone = async () => {
    const cipher = await page.evaluate(() => localStorage.getItem('yunyin.resources') || '')
    if (!cipher) return null
    const plain = CryptoJS.AES.decrypt(cipher, SAVE_SECRET).toString(CryptoJS.enc.Utf8)
    if (!plain) return null
    const v = JSON.parse(plain).spiritStone
    return typeof v === 'number' ? v : v.m * Math.pow(10, v.e)
  }
  await page.goto(INDEX + '#' + '/settings', { waitUntil: 'load' })
  await page.waitForTimeout(2200)
  await clearOverlays(page)
  checked += 1
  const s0 = await readFormatted(page, '灵石')
  let downloaded = ''
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.getByRole('button', { name: /导出存档/ }).first().click()
    ])
    downloaded = download.suggestedFilename()
    await download.saveAs(savePath)
  } catch (err) {
    failures.push(`[390] 存读场景:点「导出存档」没有拿到下载(${String(err).split('\n')[0]?.slice(0, 60)})`)
  }
  if (downloaded && !/\.save$/.test(downloaded)) failures.push(`[390] 存读场景:导出的文件名不像存档(${downloaded})`)

  // 动一下不会自己变的数:投一点灵脉,把灵石花掉
  await page.goto(INDEX + '#' + '/', { waitUntil: 'load' })
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /灵脉投资/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(400)
  const invest = page.locator('.modal-panel button.btn-ghost:not([disabled])').first()
  let spent = null
  if ((await invest.count()) === 0) failures.push('[390] 存读场景:灵脉弹窗里没有可投的脉(判据没跑到东西)')
  else {
    await invest.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(700)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    spent = await readFormatted(page, '灵石')
    if (!(spent.value < s0.value)) {
      failures.push(`[390] 存读场景:投了灵脉灵石却没少(${s0.text} → ${spent.text}),后面的导入就证明不了什么`)
    }
    /*
     * 关键一步:等节流把这次改动**真写进磁盘**再导入。
     * 否则「导入后回到 S0」与「压根没写进去」在读数上分不出来 —— 注入验证时正是这么骗过判据的
     * (跳掉导入落盘,状态照样显示 100万,因为那次投入还躺在待刷队列里)。
     */
    await page.waitForTimeout(5600)
    const onDisk = await storedStone()
    if (spent.value !== null && (onDisk === null || Math.abs(onDisk - spent.value) > spent.value * 0.01)) {
      failures.push(`[390] 存读场景:投入之后磁盘上的灵石是 ${onDisk},页面上是 ${spent.text} —— 改动没落盘,这条判据没搭对`)
    }
  }

  // 导入回来:应当回到导出那一刻(灵石回到 S0)
  await page.goto(INDEX + '#' + '/settings', { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    window.__beforeImport = 'alive'
  })
  await page.locator('input[type=file]').first().setInputFiles(savePath)
  await page.waitForTimeout(700)
  const toast = await page.evaluate(() => [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|'))
  await page.waitForTimeout(2600)
  const after = await readFormatted(page, '灵石')
  const reloaded = await page.evaluate(() => window.__beforeImport === undefined)
  if (!/导入成功/.test(toast)) failures.push(`[390] 存读场景:导入没有成功提示(${toast || '无提示'})`)
  if (!reloaded) failures.push('[390] 存读场景:导入之后没有重新入定(页面没重载,内存里还是旧的一世)')
  if (spent && after.value !== null && Math.abs(after.value - s0.value) > s0.value * 0.001) {
    failures.push(`[390] 存读场景:导入后灵石 ${after.text},导出时是 ${s0.text}(存档没救回来)`)
  }
  const diskAfter = await storedStone()
  if (spent && diskAfter !== null && Math.abs(diskAfter - s0.value) > s0.value * 0.001) {
    failures.push(`[390] 存读场景:导入后磁盘上的灵石是 ${diskAfter},导出时是 ${s0.value}(写盘那份没换回来)`)
  }
  if (pageErrors.length) failures.push(`[390] 存读场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  console.log(`\n存读往返:导出时 ${s0.text} → 投脉后 ${spent?.text ?? '(没投成)'} → 导入后 ${after.text}`)
  rmSync(savePath, { force: true })
  await ctx.close()
}

// ---- 第二十三件事:洞府营造的账目 —— 卡上写多少料,就扣多少料 ----
/*
 * 洞府是中期最主要的一处灵石去处,卡上写着「建造 · 60石 6铁」。
 * 判据核的是**玄铁**那一半:灵石同一时间会被任务/成就奖励搅动(实测开局那一下
 * 就发了三十多万,差被冲得看不出来),而玄铁除了营造没人动它,差一分就是错。
 * 读数取自背包「材料」页(界面上的数),不去解密分片 —— 写盘是节流的,磁盘会落后。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '营造自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 7), qi: 1000, wudao: 10, herb: 5, ore: 90000, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  checked += 1
  /**
   * 玄铁余额:**磁盘那一份**(精确到个位)。
   *
   * 界面上的分片只有万位三位小数(9万 → 8.998万),一位数的漂移会被四舍五入吃掉 ——
   * 实测把造价 +1 的注入就这样混过去了。故这里等节流落盘后解密比对,不取显示值。
   */
  const readOre = async () => {
    await page.waitForTimeout(5600)
    const cipher = await page.evaluate(() => localStorage.getItem('yunyin.resources') || '')
    if (!cipher) return { text: '(无分片)', value: null }
    const plain = CryptoJS.AES.decrypt(cipher, SAVE_SECRET).toString(CryptoJS.enc.Utf8)
    if (!plain) return { text: '(解不开)', value: null }
    const v = JSON.parse(plain).ore
    const n = typeof v === 'number' ? v : v.m * Math.pow(10, v.e)
    return { text: String(n), value: n }
  }
  // 先落到页面上:任何 localStorage 读数都要有 document 在(localStorage 才能读)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await clearOverlays(page)
  const oreBefore = await readOre()
  await page.goto(INDEX + '#' + '/dongfu', { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const buildBtn = page.locator('main button', { hasText: /建\s*造 · |升\s*级 · / }).first()
  if ((await buildBtn.count()) === 0) {
    failures.push('[390] 营造场景:洞府页没有可动工的建筑(判据没跑到东西)')
  } else {
    const label = ((await buildBtn.textContent()) || '').replace(/\s+/g, ' ').trim()
    const oreCost = Number((/([\d,]+)\s*铁/.exec(label.replace(/,/g, '')) || [])[1] ?? NaN)
    await buildBtn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(800)
    const toast = await page.evaluate(() =>
      [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|')
    )
    const oreAfter = await readOre()
    if (!Number.isFinite(oreCost)) failures.push(`[390] 营造场景:读不出卡片上的玄铁价(「${label}」)`)
    else if (oreBefore.value === null || oreAfter.value === null || oreBefore.value - oreAfter.value !== oreCost) {
      failures.push(`[390] 营造场景:卡片写「${label}」,玄铁实际 ${oreBefore.text} → ${oreAfter.text}(所见非所付)`)
    }
    if (!/升至|落成|建造/.test(toast)) failures.push(`[390] 营造场景:动工之后没有任何交代(${toast || '无提示'})`)
    console.log(`\n洞府营造:${label} → 玄铁 ${oreBefore.text} → ${oreAfter.text}(应扣 ${Number.isFinite(oreCost) ? oreCost : '?'})`)
  }
  if (pageErrors.length) failures.push(`[390] 营造场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第二十二件事:减少动效真的减到了(顺带在音效开着的情况下点一路按钮) ----
/*
 * 「减少动效」是个容易摆设的开关:加个类名、忘了写 CSS,界面上谁也看不出来
 * (动效仍然在动,而这条设置一般是给晕动/省电的人用的)。
 * 判据按「还会不会动」来量:animation-name 仍在不算,要看 duration 与 iteration ——
 * 减动效的做法是把时长压到 0.01ms 且只跑一次。
 * 同一场里音效与音乐都开着:每次点击都会走 unlockAudio + playSfx,这条路径
 * 冒烟夹具一律关掉声音,此前没走过。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '音画自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: true, musicOn: true, musicVol: 60, sfxVol: 60, reduceMotion: false, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await clearOverlays(page)
  checked += 1
  /** 还会动的元素:名字在不算,要看时长与次数 */
  const movingCount = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('body *')].filter(el => {
        const cs = getComputedStyle(el)
        if (cs.animationName === 'none') return false
        const dur = cs.animationDuration.split(',').map(d => parseFloat(d))
        const iter = cs.animationIterationCount.split(',')
        return dur.some(d => d > 0.05) || iter.some(i => i === 'infinite')
      }).length
    )
  const before = await movingCount()
  if (before === 0) failures.push('[390] 减动效场景:默认设置下界面本来就不动,这条判据证明不了什么')
  // 音效开着,一路点点按钮(每次点击都会走 unlockAudio + playSfx)
  for (const b of [0, 1, 2]) {
    await page.locator('main button').nth(b).click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(150)
  }
  await page.goto(INDEX + '#' + '/settings', { waitUntil: 'load' })
  await page.waitForTimeout(700)
  const box = page.locator('label', { hasText: /减少动效/ }).locator('input[type=checkbox]').first()
  if ((await box.count()) === 0) failures.push('[390] 减动效场景:设置页找不到「减少动效」开关')
  else {
    await box.check({ timeout: 2500 }).catch(() => {})
    await page.waitForTimeout(400)
    const off = await movingCount()
    if (off !== 0) failures.push(`[390] 减动效场景:开了「减少动效」仍有 ${off} 个元素在动(开关是摆设)`)
    await box.uncheck({ timeout: 2500 }).catch(() => {})
    await page.waitForTimeout(400)
    const back = await movingCount()
    if (back === 0) failures.push('[390] 减动效场景:关掉「减少动效」之后界面也一动不动(判据两向都得立得住)')
    console.log(`\n减动效:默认 ${before} 个在动 → 打开开关 ${off} 个 → 关回 ${back} 个(音效开着点了一路,无异常)`)
  }
  if (pageErrors.length) failures.push(`[390] 减动效场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第二十一件事:闭关的跨页承诺 —— 闭关中不许历练,而且当场就说 ----
/*
 * 「静坐一炷香,修炼速度 +150%;闭关期间无法外出历练」是修行页明写的一条。
 * 这条承诺跨两个页面,此前也没人真走过:去历练页点出发,模式窗照开,三选一之后
 * 才被告知「你正在闭关静修」——话是对的,但让人先白走一步。
 * 判据三件:闭关真的起效(有倒计时)、出发当场被拦且不开模式窗、回修行页闭关还在。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '闭关自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX + '#' + '/cultivation', { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await clearOverlays(page)
  checked += 1
  const retreatBtn = page.locator('main button', { hasText: /闭\s*关/ }).first()
  if ((await retreatBtn.count()) === 0) failures.push('[390] 闭关场景:修行页找不到「闭关」入口')
  else {
    await retreatBtn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(800)
    const started = await page.evaluate(() => ({
      toast: [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|'),
      countdown: /闭关中 · /.test(document.querySelector('main')?.innerText || '')
    }))
    if (!started.countdown) failures.push('[390] 闭关场景:点了闭关,修行页没有出现「闭关中」的倒计时')
    if (!/闭关/.test(started.toast)) failures.push(`[390] 闭关场景:闭关没有任何交代(${started.toast || '无提示'})`)
    // 去历练页点出发:应当当场被拦,且不开模式窗
    await page.goto(INDEX + '#' + '/adventure', { waitUntil: 'load' })
    await page.waitForTimeout(900)
    await page.locator('main button', { hasText: /出\s*发/ }).first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(600)
    const blocked = await page.evaluate(() => ({
      toast: [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|'),
      modal: !!document.querySelector('.modal-panel'),
      running: /余 \d+分\d+秒/.test(document.querySelector('main')?.innerText || '')
    }))
    if (!/闭关/.test(blocked.toast)) failures.push(`[390] 闭关场景:闭关期间点出发,出面没有说「正在闭关」(${blocked.toast || '无提示'})`)
    if (blocked.modal) failures.push('[390] 闭关场景:闭关期间点出发,还开出了模式窗(该当场拦下,不让玩家白走一步)')
    if (blocked.running) failures.push('[390] 闭关场景:闭关期间居然真的出发了')
    // 回修行页:闭关还在
    await page.goto(INDEX + '#' + '/cultivation', { waitUntil: 'load' })
    await page.waitForTimeout(800)
    const back = await page.evaluate(() => {
      const text = document.querySelector('main')?.innerText || ''
      return { still: /闭关中 · /.test(text), line: (text.match(/闭关中 · [^\r\n]*/) || [''])[0] }
    })
    if (!back.still) failures.push('[390] 闭关场景:换页回来闭关状态就丢了')
    console.log(`\n闭关:起效「${back.line}」 · 历练当场被拦(未开模式窗) · 换页仍在`)
  }
  if (pageErrors.length) failures.push(`[390] 闭关场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第二十件事:背包里的账目 —— 显示多少就扣/给多少 ----
/*
 * 强化与分解是玩家天天用的两个资源动作,而它们各自都有一处**手写数字**:
 *   强化弹窗写着「器灵尘×N · 灵石 M」;
 *   分解完弹一条「分解得器灵尘×K」。
 * 这些数字若与服务实际扣/给的对不上,玩家不会知道该信哪个。
 * 判据就一件事:拿界面上的数对界面自己的变化(器灵尘那一栏)。
 * 灵石不在判据里 —— 同一段时间里任务/成就也会发灵石,拿它做差会被别处的收益搅乱。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '锻造自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 5000 },
    inventory: {
      items: [
        { uid: 'p_w', templateId: 'w_zidian', quality: 'heaven', tier: 20, level: 4, affixes: [] },
        { uid: 'b_1', templateId: 'b_qingyun', quality: 'excellent', tier: 3, level: 0, affixes: [] }
      ],
      equipped: { weapon: 'p_w' },
      pills: {},
      artifacts: [],
      equippedArtifacts: []
    },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX + '#' + '/inventory', { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await clearOverlays(page)
  checked += 1
  /** 背包页顶上那栏「器灵尘 N」 */
  const readDust = () =>
    page.evaluate(() => {
      const m = /器灵尘\s*(\d+)/.exec(document.querySelector('main')?.innerText || '')
      return m ? Number(m[1]) : null
    })
  // 打开背包里那件(未装备、未锁定)
  await page.locator('main button', { hasText: /青云道袍/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(500)
  const costLine = await page.evaluate(() => {
    const p = document.querySelector('.modal-panel')
    const m = /器灵尘×(\d+)/.exec(p?.innerText || '')
    return m ? Number(m[1]) : null
  })
  if (costLine === null) failures.push('[390] 锻造场景:详情里没写出强化的器灵尘价(判据没跑到东西)')
  else {
    const before = await readDust()
    await page.locator('.modal-panel button', { hasText: /强\s*化/ }).first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(600)
    const after = await readDust()
    if (before === null || after === null || before - after !== costLine) {
      failures.push(`[390] 锻造场景:强化写着扣 ${costLine} 尘,实际 ${before} → ${after}(所见非所付)`)
    }
    // 接着分解同一件:提示里说给多少尘,就该给多少 —— 而且这件要从包里消失
    const dustBeforeSplit = await readDust()
    await page.locator('.modal-panel footer button').filter({ hasText: /^$/ }).first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(300)
    await page.locator('.modal-panel button', { hasText: /分解\?/ }).first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(700)
    const toast = await page.evaluate(() =>
      [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|')
    )
    const promised = Number((/分解得器灵尘×(\d+)/.exec(toast) || [])[1] ?? NaN)
    const dustAfterSplit = await readDust()
    const stillInBag = await page.evaluate(() => (document.querySelector('main')?.innerText || '').includes('青云道袍'))
    if (Number.isFinite(promised)) {
      if (dustBeforeSplit === null || dustAfterSplit === null || dustAfterSplit - dustBeforeSplit !== promised) {
        failures.push(`[390] 锻造场景:分解说给 ${promised} 尘,实际 ${dustBeforeSplit} → ${dustAfterSplit}`)
      }
      if (stillInBag) failures.push('[390] 锻造场景:分解之后那件还留在背包里')
      console.log(`\n背包账目:强化扣尘 ${costLine}(对上) · 分解得尘 ${promised}(对上,且件已出包)`)
    } else {
      failures.push(`[390] 锻造场景:分解没有给出「分解得器灵尘×N」的交代(${toast || '无提示'})`)
    }
  }
  if (pageErrors.length) failures.push(`[390] 锻造场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十九件事:真打一场历练战斗,看战报回放与战斗分析 ----
/*
 * 战报是这游戏里**看得最多**的一屏:出发 → 模式 → 等一场 → 逐行回放 → 结语,
 * 而这条链只在单元用例里跑过引擎、从没在真浏览器里走完过。
 * 判据只要四件事:探索真的开起来了、战报回放出了行、结语写清回合与胜负、
 * 战斗分析点得开且给得出数据面板(总输出/总承伤那一组)。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '战斗自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    // 一件高 Tier 的武器:让首战打得赢、回放短,判据才不至于看运气
    inventory: { items: [{ uid: 'p_w', templateId: 'w_zidian', quality: 'heaven', tier: 20, level: 4, affixes: [] }], equipped: { weapon: 'p_w' }, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX + '#' + '/adventure', { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await clearOverlays(page)
  checked += 1
  await page.locator('main button', { hasText: /出\s*发/ }).first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(600)
  // 「出发」先开模式窗:此行欲作何打算
  await page.locator('.modal-panel button', { hasText: /寻常游历/ }).first().click({ timeout: 3000 }).catch(() => {})
  // 首战间隔 12 秒 ÷ 历练速度,故最多等 30 秒
  let summary = ''
  let logLines = 0
  let lastTail = ''
  for (let i = 0; i < 45 && !summary; i += 1) {
    await page.waitForTimeout(1000)
    const info = await page.evaluate(() => {
      const text = document.querySelector('main')?.innerText || ''
      return {
        running: /余 \d+分\d+秒/.test(text),
        lines: (text.match(/击中|施展|避开|打断|气血逆涌/g) || []).length,
        summary: (text.match(/此战 \d+ 回合[^\r\n]*/) || [''])[0],
        tail: text.replace(/\s+/g, ' ').slice(-80)
      }
    })
    logLines = Math.max(logLines, info.lines)
    summary = info.summary
    lastTail = info.tail
    if (i === 0 && !info.running) failures.push('[390] 战斗场景:点了「出发」并择了模式,历练却没跑起来')
  }
  // 首战间隔 12 秒 ÷ 历练速度;45 秒还没等到,就把当前页面写进报告(「搜寻猎物中」还是「胜 N 场」一看便知)
  if (!summary) failures.push(`[390] 战斗场景:等了 45 秒也没等到一场的结语(战报回放没走完?) 当前页面:${lastTail}`)
  else {
    if (logLines === 0) failures.push('[390] 战斗场景:有结语却没有战报行(回放没出内容)')
    if (!/胜|负/.test(summary)) failures.push(`[390] 战斗场景:结语没写清胜负 —— ${summary}`)
    // 战斗分析:点开要看得到数据面板
    const analysisBtn = page.locator('main button', { hasText: /战斗分析/ }).first()
    if ((await analysisBtn.count()) === 0) failures.push('[390] 战斗场景:找不到「战斗分析」入口')
    else {
      await analysisBtn.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(400)
      const analysisText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
      if (!/总输出|总承伤/.test(analysisText)) failures.push('[390] 战斗场景:点开战斗分析也没看到数据面板(总输出/总承伤)')
      else console.log(`\n战斗回放:${summary} · 战报 ${logLines} 行 · 分析面板可开`)
    }
  }
  if (/NaN|undefined|Infinity/.test(await page.evaluate(() => document.querySelector('main')?.innerText || ''))) {
    failures.push('[390] 战斗场景:战报里漏出占位符')
  }
  if (pageErrors.length) failures.push(`[390] 战斗场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十八件事:切后台/离开页面时,待刷的存档要立刻落盘 ----
/*
 * 写盘是节流的(省电,见 savePersistence.spec),于是「刚做的改动」可能还躺在队列里;
 * 手机上的保命时机就是切后台/离开页面 —— `visibilitychange → hidden` 与 `pagehide`。
 * 单元用例测过 flushSaveWrites 本身,却没人测过这两个监听究竟接上没有:
 * 接不上,玩家切出去接个电话、回来时这一段时间就没了,而且是无声无息地没。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '落盘自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  await page.waitForTimeout(2400)
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.pointer-events-none.fixed button')) b.click()
    Math.random = () => 1
  })
  await page.waitForTimeout(500)
  /** 磁盘上那一份灵石(解密 resources 分片) */
  const diskStone = async () => {
    const cipher = await page.evaluate(() => localStorage.getItem('yunyin.resources') || '')
    if (!cipher) return null
    const plain = CryptoJS.AES.decrypt(cipher, SAVE_SECRET).toString(CryptoJS.enc.Utf8)
    if (!plain) return null
    const v = JSON.parse(plain).spiritStone
    return typeof v === 'number' ? v : v.m * Math.pow(10, v.e)
  }
  const investOnce = async () => {
    await page.getByRole('button', { name: /灵脉投资/ }).first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
    await page.locator('.modal-panel button.btn-ghost:not([disabled])').first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    return readFormatted(page, '灵石')
  }
  checked += 1
  const start = await readFormatted(page, '灵石')
  const afterInvest = await investOnce()
  const onDiskBefore = await diskStone()
  // 先确认节流确实在起作用:此刻磁盘还该是旧值,否则后面那一步证明不了什么
  if (onDiskBefore !== null && afterInvest.value !== null && Math.abs(onDiskBefore - afterInvest.value) < afterInvest.value * 0.001) {
    failures.push('[390] 落盘场景:投入之后磁盘立刻就变了 —— 节流没起作用,这条判据也就证明不了什么')
  }
  // ① 切后台
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(400)
  const afterHidden = await diskStone()
  if (afterInvest.value !== null && (afterHidden === null || Math.abs(afterHidden - afterInvest.value) > afterInvest.value * 0.01)) {
    failures.push(`[390] 落盘场景:切后台(visibilitychange→hidden)之后磁盘还是 ${afterHidden},页面已是 ${afterInvest.text} —— 待刷存档没落盘`)
  }
  // ② 离开页面(pagehide)
  const second = await investOnce()
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await page.waitForTimeout(400)
  const afterHide = await diskStone()
  if (second.value !== null && (afterHide === null || Math.abs(afterHide - second.value) > second.value * 0.01)) {
    failures.push(`[390] 落盘场景:pagehide 之后磁盘还是 ${afterHide},页面已是 ${second.text} —— 待刷存档没落盘`)
  }
  if (pageErrors.length) failures.push(`[390] 落盘场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  console.log(`\n落盘时机:开局 ${start.text} → 投脉后页面 ${afterInvest.text}(磁盘暂为旧值,节流中)→ 切后台落盘 · 再投一次 ${second.text} → pagehide 落盘`)
  await ctx.close()
}

// ---- 第十七件事:导出失败必须说出来(打断浏览器的下载能力再点一次) ----
/*
 * 「导出存档」是玩家丢档前唯一的保险。而 Web 这条路靠 `saveAs`(Blob + a[download])——
 * 受限 WebView、部分应用内浏览器里 `URL.createObjectURL` 直接不可用,于是它抛错。
 * 调用方是 `void exportSaveToDevice()`,既不看返回值也不接异常,结果就是:
 * 点下去既没文件、也没提示。故这里把下载能力打断,要求界面**说得出这句话**。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '导出自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX + '#' + '/settings', { waitUntil: 'load' })
  await page.waitForTimeout(2200)
  await clearOverlays(page)
  checked += 1
  // 把下载这条路打断 —— 受限 WebView / 应用内浏览器正是这样
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('createObjectURL is not available')
    }
  })
  await page.getByRole('button', { name: /导出存档/ }).first().click()
  await page.waitForTimeout(1500)
  const said = await page.evaluate(() =>
    [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|')
  )
  if (!/导出|下载/.test(said)) failures.push(`[390] 导出失败场景:下载能力不可用时点了「导出存档」,界面一声不响(${said || '无提示'})`)
  else console.log(`\n导出失败也说话:「${said.split('|')[0]}」`)
  if (pageErrors.length) failures.push(`[390] 导出失败场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  await ctx.close()
}

// ---- 第十六件事:坏档也能进游戏,而且要说得清哪一片坏了 ----
/*
 * 分片损坏是最容易变成「白屏」或「我的东西怎么没了」的一种事故:
 * 启动前的 preflightScan 会把读不出来的分片挪到备份键、其余照常开局。
 * 这条判据查三件事:① 照样进得去(不白屏);② 启动时说了话;
 * ③ 设置页常驻一条说得出「哪一片坏了、原档还在哪」——坏档只弹一条两秒的提示是不够的,
 *    玩家多半是先发现「灵石怎么归零了」,再回来找原因。
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'
  const enc = o => CryptoJS.AES.encrypt(JSON.stringify(o), SAVE_SECRET).toString()
  const gn = (m, e) => ({ m, e })
  const slices = {
    game: { started: true, saveVersion: 2, createdAt: Date.now(), lastActiveAt: Date.now(), totalPlaySec: 0, createRerolls: 8, createProfile: null },
    player: { name: '坏档自检', major: 5, sub: 3, exp: gn(1, 2), age: 40, lifespanBonusYears: 0, dead: false, reincarnation: { count: 0, daoFruit: 0, talents: [], insight: 0, lives: [], vow: null, trial: null, bonds: [] }, linggen: { roots: [{ element: 'wood', aptitude: 70 }], gradeName: '单灵根', growthMult: 1.1 } },
    resources: { spiritStone: gn(1, 6), qi: 1000, wudao: 10, herb: 5, ore: 5, page: 2, dust: 2 },
    inventory: { items: [], equipped: {}, pills: {}, artifacts: [], equippedArtifacts: [] },
    endgame: { daoPath: null, daoSource: 0, souls: [], equippedSouls: [] },
    settings: { privacyAccepted: true, sfxOn: false, musicOn: false, musicVol: 0, sfxVol: 0, reduceMotion: true, battleSpeed: 4, decomposeRanks: [], smartKeep: { enabled: true, minQuality: 3, keepCoreAffix: true, keepComboPiece: true }, theme: 'light' }
  }
  await ctx.addInitScript(
    data => {
      if (localStorage.getItem('__layoutSeeded')) return
      for (const [k, v] of Object.entries(data)) {
        // 故意写坏一个分片(既不是本游戏密文,也不是合法 JSON)
        localStorage.setItem(k, k.endsWith('.resources') ? '这不是存档' : v)
      }
      localStorage.setItem('__layoutSeeded', '1')
    },
    Object.fromEntries(Object.entries(slices).map(([k, v]) => [`yunyin.${k}`, enc(v)]))
  )
  const page = await ctx.newPage()
  const pageErrors = []
  watchPageErrors(page, pageErrors)
  await page.goto(INDEX, { waitUntil: 'load' })
  checked += 1
  // 启动提示只活两秒多,这里趁它在的时候读
  await page.waitForTimeout(1200)
  const boot = await page.evaluate(() => ({
    alive: !!document.querySelector('#app')?.firstElementChild,
    hash: location.hash,
    toasts: [...document.querySelectorAll('.pointer-events-none.fixed button')].map(b => (b.textContent || '').trim()).join('|'),
    backedUp: Object.keys(localStorage).some(k => k.startsWith('corrupt.'))
  }))
  if (!boot.alive) failures.push('[390] 坏档场景:坏掉一个分片之后界面都没起来(白屏)')
  if (!/损坏|异常|隔离/.test(boot.toasts)) failures.push(`[390] 坏档场景:启动时没有交代坏档(${boot.toasts || '无提示'})`)
  if (!boot.backedUp) failures.push('[390] 坏档场景:坏掉的分片没有被隔离备份(原档直接丢了)')
  await page.goto(INDEX + '#' + '/settings', { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const notice = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.card-ink')].find(c => (c.textContent || '').includes('存档版本'))
    return (card?.innerText || '').replace(/\n+/g, ' ')
  })
  if (!/分片损坏/.test(notice)) failures.push('[390] 坏档场景:设置页没有常驻交代(只说一次两秒的提示,玩家回头找不到原因)')
  if (!/资源/.test(notice)) failures.push(`[390] 坏档场景:设置页没说出坏的是哪一片 —— ${notice.slice(0, 80)}`)
  if (!/corrupt\./.test(notice)) failures.push('[390] 坏档场景:设置页没说出原档备份在哪(玩家/帮他的人找不回来)')
  if (pageErrors.length) failures.push(`[390] 坏档场景页面异常:${[...new Set(pageErrors)].join(' | ')}`)
  console.log(`
坏档开局:界面照常起来 · 启动提示「${boot.toasts.split('|')[0] ?? '无'}」 · 设置页「${notice.slice(0, 46)}…」`)
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
