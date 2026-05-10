import { notFound } from 'next/navigation'
import { verifyJwt } from '@/lib/crypto'
import { bookingRepo } from '@/lib/db/repo/bookings'

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: Record<string, string>
}) {
  const token = searchParams.token ?? params.token
  if (!token) notFound()

  let bookingId: string
  try {
    const payload = await verifyJwt(token, process.env.BOOKING_TOKEN_SECRET ?? '')
    bookingId = payload.bookingId as string
  } catch {
    notFound()
  }

  const booking = await bookingRepo.findById(bookingId)
  if (!booking) notFound()

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-xl font-bold mb-4">Tu reserva</h1>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Nombre</dt>
            <dd className="font-medium">{booking.guest_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Fechas</dt>
            <dd className="font-medium">
              {booking.start_date} → {booking.end_date}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Estado</dt>
            <dd className="font-medium capitalize">{booking.status}</dd>
          </div>
        </dl>
        {booking.status !== 'cancelled' && (
          <form
            action={`/api/bookings/${booking.id}/cancel?token=${token}`}
            method="POST"
            className="mt-6"
          >
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
            >
              Cancelar reserva
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
