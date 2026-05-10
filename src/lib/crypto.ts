import * as crypto from 'crypto'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12

export function encryptAes(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptAes(ciphertext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64')
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export async function signJwt(
  payload: JWTPayload,
  secret: string,
  expiresIn: string = '30d'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret))
}

export async function verifyJwt(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload
}

export async function hashAccessCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_COST)
}

export async function verifyAccessCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}
