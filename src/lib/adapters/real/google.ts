import type { CalendarPort } from '@/lib/ports/calendar'
import { googleClient } from '@/lib/google/client'
import type { GoogleAccount } from '@/types'

export const realCalendar: CalendarPort = {
  async createEvent(account, event) {
    const calendar = await googleClient(account as GoogleAccount)
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { date: event.startDate },
        end: { date: event.endDate },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 24 * 60 }] },
      },
    })
    const id = response.data.id
    if (!id) throw new Error('Google did not return event id')
    return { id, ...event }
  },

  async deleteEvent(account, eventId) {
    const calendar = await googleClient(account as GoogleAccount)
    await calendar.events.delete({ calendarId: 'primary', eventId })
  },
}
