import { describe, it, expect } from 'vitest'
import { inMemoryCalendar, __events } from '@/lib/adapters/inmemory/calendar'
import { inMemoryNotify, __inbox } from '@/lib/adapters/inmemory/telegram'

describe('InMemory Calendar Adapter', () => {
  it('creates and retrieves events', async () => {
    const event = await inMemoryCalendar.createEvent('fran', {
      title: 'Test',
      description: 'desc',
      startDate: '2026-06-10',
      endDate: '2026-06-15',
    })
    expect(event.id).toBeTruthy()
    expect(__events.get('fran')).toHaveLength(1)
  })

  it('deletes events', async () => {
    const event = await inMemoryCalendar.createEvent('elisa', {
      title: 'To delete',
      description: '',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
    })
    await inMemoryCalendar.deleteEvent('elisa', event.id)
    expect(__events.get('elisa')).toHaveLength(0)
  })
})

describe('InMemory Notify Adapter', () => {
  it('sends telegram messages', async () => {
    await inMemoryNotify.sendTelegram('Test message')
    expect(__inbox.lastTelegram()).toBe('Test message')
  })

  it('sends emails', async () => {
    await inMemoryNotify.sendEmail({
      to: 'test@test.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
    })
    expect(__inbox.lastEmail()?.to).toBe('test@test.com')
  })
})
