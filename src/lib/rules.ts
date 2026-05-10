import type { Settings } from '@/types'

export interface BookingRuleInput {
  start_date: string
  end_date: string
  guests_count: number
}

export interface BookingRuleError {
  field: string
  message: string
}

function toLocalDateStr(d: Date): string {
  // 'en-CA' locale formats as YYYY-MM-DD using local timezone
  return d.toLocaleDateString('en-CA')
}

function parseDateUTC(str: string): number {
  return Date.UTC(
    parseInt(str.slice(0, 4), 10),
    parseInt(str.slice(5, 7), 10) - 1,
    parseInt(str.slice(8, 10), 10),
  )
}

export function assertBookingRules(
  input: BookingRuleInput,
  settings: Settings,
  today: Date,
): BookingRuleError[] {
  const errors: BookingRuleError[] = []
  const minNotice = settings.min_notice_days ?? 3
  const maxStay = settings.max_stay_days ?? 14
  const maxGuests = settings.max_guests ?? 4

  // YYYY-MM-DD strings are lexicographically comparable — avoids timezone parsing bugs
  if (input.start_date >= input.end_date) {
    errors.push({ field: 'end_date', message: 'La fecha de salida debe ser posterior a la entrada' })
  }

  const earliest = new Date(today)
  earliest.setDate(earliest.getDate() + minNotice)
  if (input.start_date < toLocalDateStr(earliest)) {
    errors.push({
      field: 'start_date',
      message: `La reserva requiere al menos ${minNotice} días de antelación`,
    })
  }

  const diffDays = (parseDateUTC(input.end_date) - parseDateUTC(input.start_date)) / 86_400_000
  if (diffDays > maxStay) {
    errors.push({
      field: 'end_date',
      message: `La estancia máxima es de ${maxStay} días`,
    })
  }

  if (input.guests_count > maxGuests) {
    errors.push({
      field: 'guests_count',
      message: `El máximo de huéspedes es ${maxGuests}`,
    })
  }

  return errors
}
