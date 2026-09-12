/**
 * 存档加密 —— AES(crypto-js)
 * 目的:防止直接手改 localStorage/导出文件作弊,并非安全边界(密钥随包分发)
 */
import CryptoJS from 'crypto-js'

const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'

export function encryptSave(plain: string): string {
  return CryptoJS.AES.encrypt(plain, SAVE_SECRET).toString()
}

/**
 * 解密失败返回 null。
 *
 * **必须先确认它长得像密文**:crypto-js 的 Base64 解析会**跳过**非法字符,
 * 于是明文 JSON(`{"game":"yunyin-xiuxian",…}`)也可能解出一段非空乱码 ——
 * `toString(Utf8)` 不抛、`sigBytes` 也不是 0,decryptSave 就会把乱码当成明文返回。
 * 实测 500 条明文里约 3 条中招(约 0.6%),表现是「导入旧版明文存档」偶发失败,
 * 报「文件内容无法解析」——和输入内容有关、与运行环境无关,故极难复现。
 *
 * 本项目的密文一律由 encryptSave 产出(CryptoJS 带盐的 OpenSSL 格式),
 * 其 Base64 恒以 "Salted__" 的编码 U2FsdGVkX1 开头。认这个头既准确又便宜:
 * 不是它的,一律按明文走,根本不进解密。
 */
export function decryptSave(cipher: string): string | null {
  if (!cipher.startsWith('U2FsdGVkX1')) return null
  try {
    const wordArray = CryptoJS.AES.decrypt(cipher, SAVE_SECRET)
    // 解密失败时 wordArray.sigBytes === 0,转 UTF-8 得空串或乱码
    if (wordArray.sigBytes === 0) return null
    const text = wordArray.toString(CryptoJS.enc.Utf8)
    return text.length > 0 ? text : null
  } catch {
    return null
  }
}

/** 读取存档文本:优先按密文解,失败则按旧版明文返回(向后兼容) */
export function readSaveText(raw: string): string {
  return decryptSave(raw) ?? raw
}
