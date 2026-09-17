import type { RouteLocationRaw, Router } from 'vue-router'

/**
 * 返回:有站内来路就退回去,没有就回它的父页。
 *
 * 直接用 `router.back()` 会在「冷启动直接落在这一页」时把人送出游戏 ——
 * 实测(新标签页的第一次导航就是 `#/dongfu`):`history.state.back` 为 null,
 * 浏览器于是退到 `about:blank`,整个界面连这一局的上下文一起消失。
 * 书签、外部 deep link、以及 PWA 冷启动恢复上次路由,都会落到这个处境;
 * 而玩家看到的只是「点了一下返回,游戏没了」。
 *
 * 判据取自 Vue Router 自己写进 `history.state` 的 `back` 字段:
 * 有它才说明站内确实有上一页,那一页才退得;没有就老老实实去父页。
 */
export function goBack(router: Router, fallback: RouteLocationRaw): void {
  const state = window.history.state as { back?: string | null } | null
  if (state?.back) router.back()
  else void router.push(fallback)
}
