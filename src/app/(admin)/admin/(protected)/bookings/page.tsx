import { requireAdmin } from '@/lib/auth/admin'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { Card, TableRoot, TableHead, Th, TableBody, TableRow, Td, TableEmpty } from '@fran/lar'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'text-ds-warning',
  confirmed: 'text-ds-success',
  cancelled: 'text-muted-foreground',
}

export default async function AdminBookingsPage() {
  await requireAdmin()
  const bookings = await bookingRepo.findAll()

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>

      <Card padding={false}>
        <TableRoot>
          <TableHead>
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Fechas</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </TableHead>
          <TableBody>
            {bookings.length === 0 ? (
              <TableEmpty cols={5} message="No hay reservas." />
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <Td className="font-medium">{b.guest_name}</Td>
                  <Td className="text-muted-foreground">{b.guest_email}</Td>
                  <Td className="text-muted-foreground">
                    {b.start_date} → {b.end_date}
                  </Td>
                  <Td>
                    <span className={STATUS_CLASS[b.status] ?? ''}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      {b.status === 'pending' && (
                        <>
                          <form action={`/api/admin/bookings/${b.id}/confirm`} method="POST">
                            <button
                              type="submit"
                              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              Confirmar
                            </button>
                          </form>
                          <form action={`/api/admin/bookings/${b.id}/reject`} method="POST">
                            <button
                              type="submit"
                              className="rounded bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90"
                            >
                              Rechazar
                            </button>
                          </form>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <form action={`/api/admin/bookings/${b.id}/cancel`} method="POST">
                          <button
                            type="submit"
                            className="rounded bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90"
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </div>
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableRoot>
      </Card>
    </main>
  )
}
