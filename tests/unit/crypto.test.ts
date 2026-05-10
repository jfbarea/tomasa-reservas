import { describe, it, expect, vi } from 'vitest'
import { encryptAes, decryptAes, signJwt, verifyJwt, hashAccessCode, verifyAccessCode } from '@/lib/crypto'

const KEY = 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI='

describe('AES-256-GCM', () => {
  it('round-trips plaintext', () => {
    const plain = 'hello world 🔐'
    const cipher = encryptAes(plain, KEY)
    expect(cipher).not.toBe(plain)
    expect(decryptAes(cipher, KEY)).toBe(plain)
  })

  it('each encryption produces a different ciphertext', () => {
    const plain = 'same plaintext'
    const a = encryptAes(plain, KEY)
    const b = encryptAes(plain, KEY)
    expect(a).not.toBe(b)
    expect(decryptAes(a, KEY)).toBe(plain)
    expect(decryptAes(b, KEY)).toBe(plain)
  })

  it('throws on tampered ciphertext', () => {
    const cipher = encryptAes('test', KEY)
    const tampered = cipher.slice(0, -4) + 'XXXX'
    expect(() => decryptAes(tampered, KEY)).toThrow()
  })
})

describe('JWT', () => {
  it('signs and verifies', async () => {
    const token = await signJwt({ userId: '123' }, 'secret')
    const payload = await verifyJwt(token, 'secret')
    expect(payload.userId).toBe('123')
  })

  it('rejects wrong secret', async () => {
    const token = await signJwt({ x: 1 }, 'secret')
    await expect(verifyJwt(token, 'wrong')).rejects.toThrow()
  })

  it('rejects expired token', async () => {
    const token = await signJwt({ x: 1 }, 'secret', '1s')
    vi.advanceTimersByTime(5000)
    await expect(verifyJwt(token, 'secret')).rejects.toThrow()
  })
})

describe('bcrypt', () => {
  it('hashes and verifies', async () => {
    const hash = await hashAccessCode('tomasa-dev')
    expect(await verifyAccessCode('tomasa-dev', hash)).toBe(true)
    expect(await verifyAccessCode('wrong', hash)).toBe(false)
  })
})
