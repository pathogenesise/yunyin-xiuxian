/**
 * PWA 图标生成 —— 从矢量源 public/icon[-maskable].svg 光栅化出各平台的 PNG。
 *
 * 用法: bun scripts/gen-pwa-icons.mjs   (或 node scripts/gen-pwa-icons.mjs)
 * 产物:
 *   public/icons/icon-192.png          web app manifest(常规)
 *   public/icons/icon-512.png          web app manifest(常规)
 *   public/icons/icon-maskable-512.png web app manifest(maskable,全出血+安全区)
 *   public/apple-touch-icon.png        iOS「添加到主屏幕」(180×180,无透明)
 *
 * 源 SVG 为纯矢量几何(无字体依赖),sharp 的 librsvg 渲染稳定可复现。
 */
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '../public')
const iconsDir = resolve(pub, 'icons')

await mkdir(iconsDir, { recursive: true })

const regular = [
  ['icon-192.png', 192],
  ['icon-512.png', 512]
]

for (const [name, size] of regular) {
  await sharp(resolve(pub, 'icon.svg')).resize(size, size).png().toFile(resolve(iconsDir, name))
}

await sharp(resolve(pub, 'icon-maskable.svg'))
  .resize(512, 512)
  .png()
  .toFile(resolve(iconsDir, 'icon-maskable-512.png'))

// apple-touch-icon 必须不透明(iOS 会把透明处合成黑色),故用全出血的 maskable 源并 flatten 掉 alpha
await sharp(resolve(pub, 'icon-maskable.svg'))
  .resize(180, 180)
  .flatten({ background: '#F3EFE4' })
  .png()
  .toFile(resolve(pub, 'apple-touch-icon.png'))

console.log('PWA icons generated:')
for (const name of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  console.log(`  public/${name === 'apple-touch-icon.png' ? name : `icons/${name}`}`)
}
