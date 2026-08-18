import crypto from "crypto"
import { env } from "../config/env"

// Compatível com o esquema já usado pelas apps móveis (crypto-js):
// AES-ECB + PKCS7 padding, ciphertext em Base64, sem IV (ECB não usa).
function algorithmFor(keyBytes: Buffer): string {
  switch (keyBytes.length) {
    case 16:
      return "aes-128-ecb"
    case 24:
      return "aes-192-ecb"
    case 32:
      return "aes-256-ecb"
    default:
      throw new Error(`QR_SECRET_KEY must be 16, 24 or 32 bytes, got ${keyBytes.length}`)
  }
}

export function encryptQrPayload(plainText: string, key: string = env.QR_SECRET_KEY): string {
  const keyBytes = Buffer.from(key, "utf8")
  const cipher = crypto.createCipheriv(algorithmFor(keyBytes), keyBytes, null)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  return encrypted.toString("base64")
}

export function decryptQrPayload(cipherTextBase64: string, key: string = env.QR_SECRET_KEY): string {
  const keyBytes = Buffer.from(key, "utf8")
  const decipher = crypto.createDecipheriv(algorithmFor(keyBytes), keyBytes, null)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherTextBase64, "base64")), decipher.final()])
  return decrypted.toString("utf8")
}
