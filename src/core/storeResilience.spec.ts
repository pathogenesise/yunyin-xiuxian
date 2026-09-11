/**
 * 坏档韧性 —— 缺字段不该白屏
 *
 * 存档会被写坏、被改坏,或在旧版本里根本没有某一栏。游戏为此在各 store 里
 * 备了 sanitize():读档后把形状不对的字段修回默认值。
 *
 * 但「修」的前提是它自己别先炸。本轮实测:player.sanitize 只挡了
 * suppressQualified,没挡 suppressedRegions,于是 `for...of` 直接抛错 ——
 * 玩家看到的是白屏,而不是「回到云隐山下」。
 *
 * 故这里不看某一条字段有没有写进 sanitize,而是**逐个字段灌 undefined**:
 * 声明了 sanitize 的每个 store,每个持久化字段被抹掉后,sanitize 都必须跑完、
 * 且结果仍可 JSON 序列化。将来新增字段忘了兜底,这里会先红。
 */
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia, type Store } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useResourcesStore } from '@/stores/resources'
import { useDongfuStore } from '@/stores/dongfu'
import { useLoreStore } from '@/stores/lore'
import { useCultivationStore } from '@/stores/cultivation'
import { useInventoryStore } from '@/stores/inventory'
import { useQuestsStore } from '@/stores/quests'
import { useAdventureStore } from '@/stores/adventure'
import { useEndgameStore } from '@/stores/endgame'
import { useLoadoutsStore } from '@/stores/loadouts'
import { useSettingsStore } from '@/stores/settings'
import { useGameStore } from '@/stores/game'
import type { BondState } from '@/core/daoluService'

/** 有 sanitize 的 store:名字 → 取 store 的函数 */
const STORES: { name: string; use: () => Store & { sanitize: () => void } }[] = [
  { name: 'player', use: usePlayerStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'resources', use: useResourcesStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'dongfu', use: useDongfuStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'lore', use: useLoreStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'cultivation', use: useCultivationStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'inventory', use: useInventoryStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'quests', use: useQuestsStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'adventure', use: useAdventureStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'endgame', use: useEndgameStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'loadouts', use: useLoadoutsStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'settings', use: useSettingsStore as unknown as () => Store & { sanitize: () => void } },
  { name: 'game', use: useGameStore as unknown as () => Store & { sanitize: () => void } }
]

describe('坏档韧性 · 每个字段被抹掉后 sanitize 都要跑得完', () => {
  for (const { name, use } of STORES) {
    it(`${name}:逐个字段灌 undefined,不炸且仍可序列化`, () => {
      setActivePinia(createPinia())
      const keys = Object.keys(use().$state)
      expect(keys.length, `${name} 取不到持久化字段,断言形同虚设`).toBeGreaterThan(0)

      const failures: string[] = []
      for (const key of keys) {
        setActivePinia(createPinia())
        const store = use()
        try {
          store.$patch({ [key]: undefined } as never)
          store.sanitize()
          JSON.stringify(store.$state)
          /**
           * 只跑 sanitize 不够:真正的白屏发生在**渲染期读 computed** 的时候
           * (如 cultivation.gongfaMods 对 null 的 gongfaBranch 调 Object.entries)。
           * 故这里把 store 上每个非函数属性都读一遍 —— 等价于把这个页面渲染一次。
           */
          for (const prop of Object.keys(store)) {
            const v = (store as unknown as Record<string, unknown>)[prop]
            if (typeof v === 'function') continue
            try {
              JSON.stringify(v)
            } catch {
              // 循环引用(如 ref 自身)不是坏档问题;这里只为触发 computed 求值
            }
          }
        } catch (e) {
          failures.push(`${key}: ${(e as Error).message}`)
        }
      }
      expect(failures, `${name}.sanitize 在这些字段缺失时会抛错:\n${failures.join('\n')}`).toEqual([])
    })
  }
})

/** 坏档不只"缺字段":也可能是形状对、内容是垃圾(数组里塞 null、记录值塞 null) */
const HOSTILE: unknown[] = [null, 0, -1, NaN, '', 'x', [], {}, [null], { a: null }, true, [{ uid: null }]]

describe('坏档韧性 · 恶意值也不该炸', () => {
  for (const { name, use } of STORES) {
    it(`${name}:每个字段灌一遍恶意值,sanitize + 计算属性都不许抛`, () => {
      setActivePinia(createPinia())
      const keys = Object.keys(use().$state)

      const failures: string[] = []
      for (const key of keys) {
        for (const hostile of HOSTILE) {
          setActivePinia(createPinia())
          const store = use()
          try {
            store.$patch({ [key]: hostile } as never)
            store.sanitize()
            for (const prop of Object.keys(store)) {
              const v = (store as unknown as Record<string, unknown>)[prop]
              if (typeof v === 'function') continue
              try {
                JSON.stringify(v)
              } catch {
                // 循环引用不是坏档问题
              }
            }
          } catch (e) {
            failures.push(`${key} = ${JSON.stringify(hostile) ?? String(hostile)} → ${(e as Error).message}`)
          }
        }
      }
      expect(failures, `${name} 在这些恶意值下会抛错:\n${[...new Set(failures)].join('\n')}`).toEqual([])
    })
  }
})

describe('坏档韧性 · 复杂状态的值也要修回来(不只是"不炸")', () => {
  it('道侣:三维夹回 0~100、坏 id 作废、坏意图整块丢掉', () => {
    setActivePinia(createPinia())
    const player = usePlayerStore()
    const bad = {
      daoluId: 'dl_qingli',
      stage: 'nope',
      fate: 999,
      trust: NaN,
      accord: -5,
      shared: -3,
      metAt: -1,
      fallen: 'x',
      doneEvents: ['be_relic', 42],
      opportunities: -2,
      nextEventAt: NaN,
      intent: { wish: 1, sparks: 'bad' }
    } as unknown as BondState
    player.$patch({ bond: bad })
    player.sanitize()
    const b = player.bond!
    expect(b.fate).toBe(100)
    expect(b.trust).toBe(0)
    expect(b.accord).toBe(0)
    expect(b.stage).toBe('met')
    expect(b.shared).toBe(0)
    expect(b.doneEvents).toEqual(['be_relic'])
    expect(b.intent).toBeNull()
    expect(b.fallen).toBe(false)

    player.$patch({ bond: { ...b, daoluId: 'dl_nope' } as unknown as BondState })
    player.sanitize()
    expect(player.bond).toBeNull()
  })
})
