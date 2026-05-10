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

export function assertBookingRules(
  input: BookingRuleInput,
  settings: Settings,
  today: Date,
): BookingRuleError[] {
  const errors: BookingRuleError[] = []
  const minNotice = settings.min_notice_days ?? 3
  const maxStay = settings.max_stay_days ?? 14
  const maxGuests = settings.max_guests ?? 4

  const start = new Date(input.start_date)
  const end = new Date(input.end_date)

  if (start >= end) {
    errors.push({ field: 'end_date', message: 'La fecha de salida debe ser posterior a la entrada' })
  }

  const earliestStart = new Date(today)
  earliestStart.setDate(earliestStart.getDate() + minNotice)
  if (start < earliestStart) {
    errors.push({
      field: 'start_date',
      message: `La reserva requiere al menos ${minNotice} días de antelación`,
    })
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
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
