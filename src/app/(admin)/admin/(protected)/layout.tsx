'use client'

import { useState } from 'react'
import { AppBar, Sidebar, cn } from '@fran/lar'
import { Ban, Calendar, LayoutDashboard, LogOut, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: '/admin', exact: true },
  { href: '/admin/bookings', label: 'Reservas', icon: Calendar, match: '/admin/bookings' },
  { href: '/admin/blocks', label: 'Bloqueos', icon: Ban, match: '/admin/blocks' },
  { href: '/admin/settings', label: 'Ajustes', icon: Settings, match: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <AppBar title="Tomasa" onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          title="Tomasa"
          items={NAV_ITEMS}
          footer={
            <form method="POST" action="/api/admin/logout">
              <button
                type="submit"
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm',
                  'text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground',
                )}
              >
                <LogOut size={18} className="shrink-0" />
                Cerrar sesión
              </button>
            </form>
          }
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  )
}
