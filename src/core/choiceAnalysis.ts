/**
 * Phase 29 决策价值分析 —— 区分"伪选择 / 正常偏好 / 情境选择 / 未充分暴露"
 *
 * 核心原则(来自用户反馈):
 * 不要因为"某选项 >85%"就直接判定为伪选择。
 * 需要同时看:
 *  1. 选择率        → 玩家实际选了什么
 *  2. 选择场景      → 触发时的玩家状态(修为是否满/丹药是否稀缺)
 *  3. 选择后收益    → 这个选择实际带来了什么
 *  4. 替代方案价值  → 其他选项在对应场景下是否真的有竞争力
 *
 * 判定输出:
 * - pseudo   伪选择:无任何场景能合理化分布,需要修
 * - normal   正常偏好:分布合理,场景解释了选择
 * - contextual 情境选择:分布受场景驱动,本身没问题
 * - underexposed 未充分暴露:某个选项几乎从没出现,应该提高暴露率
 */
export interface ChoiceAnalysis {
  /** 事件类型(如 enlightenment / breakthrough_prep) */
  type: string
  /** 各选项选择分布 */
  distribution: Record<string, number>
  /** 常见触发场景(用于解释分布) */
  contexts: string[]
  /** 伪选择/正常/情境/未充分暴露 */
  verdict: 'pseudo' | 'normal' | 'contextual' | 'underexposed'
  /** 建议:是否需要调整选项设计 */
  suggestion?: string
}

// 伪选择检测阈值:某选项占比超过该值且无场景能解释,判定为伪选择
const PSEUDO_RATIO = 0.85

/**
 * 分析一次事件的选择分布
 * @param type 事件类型
 * @param choices 各选项被选次数 { optionId: count }
 * @param total 总选择次数
 * @param contexts 触发场景(用于解释分布)
 */
export function analyzeChoices(
  type: string,
  choices: Record<string, number>,
  total: number,
  contexts: string[]
): ChoiceAnalysis {
  const distribution: Record<string, number> = {}
  for (const [k, v] of Object.entries(choices)) {
    distribution[k] = total > 0 ? Math.round((v / total) * 100) : 0
  }

  const maxRatio = Math.max(...Object.values(distribution), 0)

  let verdict: ChoiceAnalysis['verdict'] = 'normal'
  let suggestion: string | undefined

  if (total === 0) {
    verdict = 'underexposed'
    suggestion = '玩家尚未充分接触该事件,建议提高触发率'
  } else if (maxRatio > PSEUDO_RATIO) {
    // 超过 85% 选择率:需要场景解释
    verdict = 'contextual'
    suggestion = '存在高度偏向选项,检查是否有场景能解释(如修为已满时必选强化)'
  } else {
    // 分布均衡:正常偏好
    verdict = 'normal'
  }

  return {
    type,
    distribution,
    contexts,
    verdict,
    suggestion
  }
}

// 获取选项的收益值(用于"选择后的收益"分析)
export type OptionValue = number

// 比较两个选项的实际收益差异
export function valueGap(a: OptionValue, b: OptionValue): number {
  return Math.abs(a - b)
}
