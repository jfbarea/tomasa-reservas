import { requireAdmin } from '@/lib/auth/admin'
import { blocksRepo } from '@/lib/db/repo/blocks'
import { Card, TableRoot, TableHead, Th, TableBody, TableRow, Td, TableEmpty } from '@fran/lar'

export default async function AdminBlocksPage() {
  await requireAdmin()
  const blocks = await blocksRepo.findAll()

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bloqueos de fechas</h1>
        <a
          href="/admin/blocks/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo bloqueo
        </a>
      </div>

      <Card padding={false}>
        <TableRoot>
          <TableHead>
            <Th>Fechas</Th>
            <Th>Motivo</Th>
            <Th>Acciones</Th>
          </TableHead>
          <TableBody>
            {blocks.length === 0 ? (
              <TableEmpty cols={3} message="No hay bloqueos." />
            ) : (
              blocks.map((b) => (
                <TableRow key={b.id}>
                  <Td className="text-muted-foreground">
                    {b.start_date} → {b.end_date}
                  </Td>
                  <Td>{b.reason}</Td>
                  <Td>
                    <form action={`/api/admin/blocks/${b.id}`} method="POST">
                      <input type="hidden" name="_method" value="DELETE" />
                      <button
                        type="submit"
                        className="rounded bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90"
                      >
                        Eliminar
                      </button>
                    </form>
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
