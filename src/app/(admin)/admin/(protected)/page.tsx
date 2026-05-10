import { requireAdmin } from '@/lib/auth/admin'
import { bookingRepo } from '@/lib/db/repo/bookings'
import { Card, TableRoot, TableHead, Th, TableBody, TableRow, Td, TableEmpty } from '@fran/lar'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const pending = await bookingRepo.findByStatus('pending')
  const upcoming = await bookingRepo.findUpcoming()

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Pendientes de aprobación ({pending.length})
        </h2>
        <Card padding={false}>
          <TableRoot>
            <TableHead>
              <Th>Nombre</Th>
              <Th>Fechas</Th>
              <Th>Huéspedes</Th>
            </TableHead>
            <TableBody>
              {pending.length === 0 ? (
                <TableEmpty cols={3} message="No hay reservas pendientes." />
              ) : (
                pending.map((b) => (
                  <TableRow key={b.id}>
                    <Td className="font-medium">{b.guest_name}</Td>
                    <Td className="text-muted-foreground">{b.start_date} → {b.end_date}</Td>
                    <Td>{b.guests_count}</Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableRoot>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Próximas visitas ({upcoming.length})
        </h2>
        <Card padding={false}>
          <TableRoot>
            <TableHead>
              <Th>Nombre</Th>
              <Th>Fechas</Th>
              <Th>Huéspedes</Th>
            </TableHead>
            <TableBody>
              {upcoming.length === 0 ? (
                <TableEmpty cols={3} message="No hay visitas próximas." />
              ) : (
                upcoming.map((b) => (
                  <TableRow key={b.id}>
                    <Td className="font-medium">{b.guest_name}</Td>
                    <Td className="text-muted-foreground">{b.start_date} → {b.end_date}</Td>
                    <Td>{b.guests_count}</Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableRoot>
        </Card>
      </section>
    </main>
  )
}
