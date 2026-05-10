'use client'

import { useState, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { addDays, format, parseISO } from 'date-fns'
import BookingForm from './BookingForm'
import 'react-day-picker/dist/style.css'
import type { AvailabilityDay } from '@/types'

export default function AvailabilityCalendar() {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([])
  const [range, setRange] = useState<DateRange | undefined>()
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    const from = format(month, 'yyyy-MM-dd')
    const to = format(addDays(month, 60), 'yyyy-MM-dd')
    fetch(`/api/availability?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setAvailability)
  }, [month])

  const disabledDays = availability
    .filter((d) => d.status !== 'available')
    .map((d) => parseISO(d.date))

  const bookedDays = availability.filter((d) => d.status === 'booked').map((d) => parseISO(d.date))
  const blockedDays = availability
    .filter((d) => d.status === 'blocked')
    .map((d) => parseISO(d.date))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <style>{`
          .rdp { --rdp-accent-color: var(--ds-yellow); --rdp-background-color: rgba(255,255,255,0.1); color: var(--foreground); }
          .rdp-caption_label { color: var(--foreground); font-weight: 600; }
          .rdp-head_cell { color: var(--muted-foreground); font-weight: 500; }
          .rdp-nav_button { color: var(--foreground); border-color: var(--border); }
          .rdp-nav_button:hover:not([disabled]) { background-color: rgba(255,255,255,0.1); }
          .rdp-day { color: var(--foreground); border-radius: 0.375rem; }
          .rdp-day:hover:not(.rdp-day_outside):not(.rdp-day_disabled):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); }
          .rdp-day_selected, .rdp-day_range_start, .rdp-day_range_end { background-color: var(--ds-yellow) !important; color: var(--ds-black) !important; font-weight: 600; }
          .rdp-day_range_middle { background-color: rgba(242,201,76,0.2) !important; color: var(--foreground) !important; border-radius: 0; }
          .rdp-day_outside { color: var(--muted-foreground); opacity: 0.4; }
          .rdp-day_disabled { color: var(--muted-foreground); opacity: 0.3; }
        `}</style>
        <DayPicker
          mode="range"
          selected={range}
          onSelect={setRange}
          onMonthChange={setMonth}
          locale={es}
          disabled={[...disabledDays, { before: new Date() }]}
          modifiers={{ booked: bookedDays, blocked: blockedDays }}
          modifiersStyles={{
            booked: { backgroundColor: 'rgba(242,201,76,0.25)', color: 'var(--foreground)' },
            blocked: { backgroundColor: 'rgba(239,68,68,0.25)', color: 'var(--foreground)' },
          }}
          fromDate={new Date()}
        />
        <div className="flex gap-4 text-xs mt-2 text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-primary/25 inline-block" /> Reservado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-destructive/25 inline-block" /> Bloqueado
          </span>
        </div>
      </div>

      {range?.from && range?.to && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-4">Solicitar reserva</h2>
          <BookingForm
            selectedRange={{ from: range.from, to: range.to }}
            onSuccess={() => setRange(undefined)}
          />
        </div>
      )}
    </div>
  )
}
