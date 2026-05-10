import { requireAdmin } from '@/lib/auth/admin'
import { settingsRepo } from '@/lib/db/repo/settings'
import { Card } from '@fran/lar'

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  await requireAdmin()
  const settings = await settingsRepo.getAll()

  return (
    <main className="p-6 max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>

      {searchParams.connected && (
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          Cuenta <span className="font-medium">{searchParams.connected}</span> conectada correctamente.
        </div>
      )}

      <Card>
        <h2 className="text-base font-medium mb-4">Reglas de reserva</h2>
        <form action="/api/admin/settings" method="POST" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Días mínimos de antelación
            </label>
            <input
              type="number"
              name="min_notice_days"
              defaultValue={settings.min_notice_days ?? 3}
              className="h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Días máximos de estancia
            </label>
            <input
              type="number"
              name="max_stay_days"
              defaultValue={settings.max_stay_days ?? 14}
              className="h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Máximo de huéspedes
            </label>
            <input
              type="number"
              name="max_guests"
              defaultValue={settings.max_guests ?? 4}
              className="h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="auto_confirm"
              id="auto_confirm"
              defaultChecked={settings.auto_confirm ?? false}
              className="accent-primary"
            />
            <label htmlFor="auto_confirm" className="text-sm font-medium">
              Confirmar reservas automáticamente
            </label>
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Guardar
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-medium mb-4">Códigos de acceso</h2>
        <form action="/api/admin/settings" method="POST" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Nuevo código de acceso (guests)
            </label>
            <input
              type="text"
              name="access_code"
              placeholder="Dejar vacío para no cambiar"
              className="h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">
              Nueva contraseña de administrador
            </label>
            <input
              type="password"
              name="admin_password"
              placeholder="Dejar vacío para no cambiar"
              className="h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Actualizar
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-medium mb-4">Google Calendar</h2>
        <div className="space-y-2">
          <a
            href="/api/admin/google/connect/fran"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:bg-white/5"
          >
            <span>Conectar cuenta de Fran</span>
            <span className="text-muted-foreground">→</span>
          </a>
          <a
            href="/api/admin/google/connect/elisa"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:bg-white/5"
          >
            <span>Conectar cuenta de Elisa</span>
            <span className="text-muted-foreground">→</span>
          </a>
        </div>
      </Card>
    </main>
  )
}
