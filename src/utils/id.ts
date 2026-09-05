/** 唯一 ID 生成 */

let counter = 0

export function uid(): string {
  counter = (counter + 1) % 46656
  return Date.now().toString(36) + counter.toString(36).padStart(3, '0') + Math.floor(Math.random() * 1296).toString(36)
}
