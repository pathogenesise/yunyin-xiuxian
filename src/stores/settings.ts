/** 设置 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { persistConfig } from '@/utils/storage'

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
    /** 智能收纳(Phase 26):行囊自动去留规则 */
    const smartKeep = ref({
      enabled: false,
      /** 达到此品质 rank 一律保留 */
      minQuality: 3,
      keepCoreAffix: true,
      keepComboPiece: true
    })
    /** 是否已同意隐私政策(欢迎页勾选后记录,老档视为已同意) */
    const privacyAccepted = ref(false)
    /** 主题:跟随系统 / 日间 / 夜间 */
    const theme = ref<'auto' | 'light' | 'dark'>('auto')

    return { sfxOn, musicOn, musicVol, sfxVol, reduceMotion, battleSpeed, decomposeRanks, smartKeep, privacyAccepted, theme }
  },
  { persist: persistConfig('settings') }
)
