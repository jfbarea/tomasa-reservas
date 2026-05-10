'use client'

import { useState } from 'react'
import { CreateBookingSchema } from '@/lib/validation/booking'
import type { CreateBookingInput } from '@/lib/validation/booking'

interface Props {
  selectedRange?: { from: Date; to: Date }
  onSuccess?: (booking: unknown) => void
}

const inputClass =
  'h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function BookingForm({ selectedRange, onSuccess }: Props) {
  const [form, setForm] = useState<Partial<CreateBookingInput>>({
    start_date: selectedRange?.from ? selectedRange.from.toISOString().slice(0, 10) : '',
    end_date: selectedRange?.to ? selectedRange.to.toISOString().slice(0, 10) : '',
    guests_count: 1,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'guests_count' ? Number(value) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const parsed = CreateBookingSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    if (res.ok) {
      const data = await res.json()
      setSuccess(true)
      onSuccess?.(data)
    } else {
      const data = await res.json()
      setErrors({ _form: data.error ?? 'Error al enviar la reserva' })
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="font-medium">¡Reserva enviada correctamente!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Te enviaremos un email cuando sea confirmada.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">Nombre</label>
        <input
          name="guest_name"
          value={form.guest_name ?? ''}
          onChange={handleChange}
          placeholder="Tu nombre completo"
          className={inputClass}
        />
        {errors.guest_name && <p className="text-destructive text-xs mt-1">{errors.guest_name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">Email</label>
        <input
          name="guest_email"
          type="email"
          value={form.guest_email ?? ''}
          onChange={handleChange}
          placeholder="tu@email.com"
          className={inputClass}
        />
        {errors.guest_email && <p className="text-destructive text-xs mt-1">{errors.guest_email}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1 text-muted-foreground">Llegada</label>
          <input
            name="start_date"
            type="date"
            value={form.start_date ?? ''}
            onChange={handleChange}
            className={inputClass}
          />
          {errors.start_date && <p className="text-destructive text-xs mt-1">{errors.start_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-muted-foreground">Salida</label>
          <input
            name="end_date"
            type="date"
            value={form.end_date ?? ''}
            onChange={handleChange}
            className={inputClass}
          />
          {errors.end_date && <p className="text-destructive text-xs mt-1">{errors.end_date}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">Número de personas</label>
        <input
          name="guests_count"
          type="number"
          min={1}
          max={10}
          value={form.guests_count ?? 1}
          onChange={handleChange}
          className={inputClass}
        />
        {errors.guests_count && <p className="text-destructive text-xs mt-1">{errors.guests_count}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-muted-foreground">Notas (opcional)</label>
        <textarea
          name="notes"
          value={form.notes ?? ''}
          onChange={handleChange}
          rows={3}
          placeholder="Cualquier cosa que quieras contarnos..."
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.notes && <p className="text-destructive text-xs mt-1">{errors.notes}</p>}
      </div>
      {errors._form && <p className="text-destructive text-sm">{errors._form}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Solicitar reserva'}
      </button>
    </form>
  )
}
