/**
 * 存档加密 —— AES(crypto-js)
 * 目的:防止直接手改 localStorage/导出文件作弊,并非安全边界(密钥随包分发)
 */
import CryptoJS from 'crypto-js'

const SAVE_SECRET = 'yunyin-xiuxian::dao-in-the-clouds::v1'

export function encryptSave(plain: string): string {
  return CryptoJS.AES.encrypt(plain, SAVE_SECRET).toString()
}

/** 解密失败返回 null */
export function decryptSave(cipher: string): string | null {
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
