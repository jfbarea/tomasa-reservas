'use client'

import type { Booking } from '@/types'

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

interface Props {
  booking: Booking
}

export default function BookingCard({ booking }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{booking.guest_name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status] ?? ''}`}>
          {statusLabels[booking.status] ?? booking.status}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        {booking.start_date} → {booking.end_date} · {booking.guests_count} persona
        {booking.guests_count !== 1 ? 's' : ''}
      </p>
      {booking.notes && <p className="text-sm text-gray-500">{booking.notes}</p>}
    </div>
  )
}
