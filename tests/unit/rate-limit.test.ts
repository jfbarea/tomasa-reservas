import { describe, it, expect } from 'vitest'

describe('rate-limit logic (unit)', () => {
  it('tracks counts correctly', () => {
    const timestamps: number[] = []
    const windowMs = 600000

    function addRecord() {
      timestamps.push(Date.now())
    }

    function count() {
      const since = Date.now() - windowMs
      return timestamps.filter((t) => t > since).length
    }

    expect(count()).toBe(0)
    addRecord()
    addRecord()
    expect(count()).toBe(2)
  })
})
