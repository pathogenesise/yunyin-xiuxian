/** 设置 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { persistConfig } from '@/utils/storage'
import { asArray, asFiniteNumber, asRecord } from '@/utils/saveShape'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const sfxOn = ref(true)
    const musicOn = ref(true)
    /** 音量 0~100 */
    const musicVol = ref(50)
    const sfxVol = ref(70)
    const reduceMotion = ref(false)
    /** 战报播放速度倍率 */
    const battleSpeed = ref<1 | 2 | 4>(1)
    /** 一键分解勾选的品质 rank 列表(持久化,免得每次重勾) */
    const decomposeRanks = ref<number[]>([0, 1])
    /** 智能收纳(Phase 26):行囊自动去留规则(字段口径见 SmartKeepConfig,不另抄一份) */
    const smartKeep = ref<import('@/core/smartKeep').SmartKeepConfig>({
      enabled: false,
      minQuality: 3,
      keepCoreAffix: true,
      keepComboPiece: true,
      keepPerfectRolls: true,
      keepSetPiece: true
    })
    /** 是否已同意隐私政策(欢迎页勾选后记录,老档视为已同意) */
    const privacyAccepted = ref(false)
    /** 主题:跟随系统 / 日间 / 夜间 */
    const theme = ref<'auto' | 'light' | 'dark'>('auto')

    /** 存档修复:设置项被写坏会让音量/战斗速度算出 NaN,或让主题类名失效 */
    function sanitize(): void {
      // 音量是 0~100 的整数,不是 0~1 —— 别照搬比例类的写法
      musicVol.value = Math.min(100, asFiniteNumber(musicVol.value, 50, 0))
      sfxVol.value = Math.min(100, asFiniteNumber(sfxVol.value, 70, 0))
      if (![1, 2, 4].includes(battleSpeed.value)) battleSpeed.value = 1
      if (!['auto', 'light', 'dark'].includes(theme.value)) theme.value = 'auto'
      decomposeRanks.value = asArray<number>(decomposeRanks.value).filter(n => typeof n === 'number' && Number.isFinite(n))
      const sk = asRecord<unknown>(smartKeep.value)
      smartKeep.value = {
        enabled: sk.enabled === true,
        minQuality: Math.floor(asFiniteNumber(sk.minQuality, 3, 0)),
        keepCoreAffix: sk.keepCoreAffix !== false,
        keepComboPiece: sk.keepComboPiece !== false,
        keepPerfectRolls: sk.keepPerfectRolls !== false,
        keepSetPiece: sk.keepSetPiece !== false
      }
    }

    return {
      sfxOn,
      musicOn,
      musicVol,
      sfxVol,
      reduceMotion,
      battleSpeed,
      decomposeRanks,
      smartKeep,
      privacyAccepted,
      theme,
      sanitize
    }
  },
  { persist: persistConfig('settings') }
)
