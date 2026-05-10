export interface CalendarEvent {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
}

export interface CalendarPort {
  createEvent(account: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent>
  deleteEvent(account: string, eventId: string): Promise<void>
}
