# SPEC.md — `tomasa`

> App personal para gestionar visitas de amigos a la nueva casa en Granada.
> Reservas con sincronización a Google Calendar de Fran y Elisa, y bloqueo de
> fechas por los owners.
>
> Servida desde `tomasa.franbarea.dev`.

---

## 1. Resumen

- **Problema**: coordinar visitas de amigos sin colisiones ni mantener un
  calendario compartido a mano.
- **Solución**: web app con código de acceso compartido donde los amigos
  consultan disponibilidad y reservan rango de fechas. Cada reserva
  confirmada genera eventos en los Google Calendars de Fran y Elisa.
- **Usuarios**:
  - **Owners** (Fran + Elisa): bloquean fechas, aprueban/rechazan reservas,
    ven dashboard.
  - **Guests** (amigos): consultan disponibilidad y reservan con un código.

## 2. Objetivos (v1)

- Calendario visual de disponibilidad.
- Reserva con `start_date` / `end_date`, número de huéspedes y notas.
- Sync a Google Calendar de ambos owners (crear, modificar, cancelar).
- Bloqueo manual de fechas por los owners.
- Acceso por código compartido (sin signup para guests).
- Notificación a los owners por Telegram al recibir reserva.
- Email de confirmación al guest (Resend).

## 3. No-objetivos

- App nativa.
- Pagos / depósitos.
- Reservas solapadas (compartir habitación).
- Multi-casa.
- Chat in-app.
- i18n (solo español).

## 4. Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **Calendario UI**: `react-day-picker`.
- **Backend**: Route Handlers de Next (runtime Node, no Edge).
- **DB**: Supabase (Postgres + RLS).
- **Auth**:
  - Owners → contraseña fija de un solo uso (hash bcrypt en `settings`), setea cookie `admin-session`.
  - Guests → cookie HttpOnly firmada tras validar código.
- **Calendarios**: Google Calendar API v3 vía OAuth2.
- **Notificaciones**: Telegram Bot API (grupo con Fran y Elisa) + Resend.
- **Hosting**: Netlify con `@netlify/plugin-nextjs`. Dominio público
  `tomasa.franbarea.dev` (CNAME a Netlify).
- **CI**: GitHub Actions (lint + typecheck + test).

## 5. Modelo de datos (Supabase)

### `bookings`
| columna                  | tipo            | notas                                 |
|--------------------------|-----------------|---------------------------------------|
| id                       | uuid pk         |                                       |
| guest_name               | text not null   |                                       |
| guest_email              | text not null   |                                       |
| start_date               | date not null   | inclusivo                             |
| end_date                 | date not null   | exclusivo (día de salida libre)       |
| guests_count             | int not null    | default 1                             |
| notes                    | text            |                                       |
| status                   | enum            | `pending` \| `confirmed` \| `cancelled` |
| google_event_id_fran     | text            |                                       |
| google_event_id_elisa    | text            |                                       |
| cancel_token             | text            | firmado, para link de cancelación     |
| created_at, updated_at   | timestamptz     |                                       |

Constraints:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_dates_check CHECK (start_date < end_date),
  ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (daterange(start_date, end_date, '[)') WITH &&)
    WHERE (status IN ('pending','confirmed'));
```

### `blocked_periods`
- `id` uuid pk
- `start_date`, `end_date` (mismo criterio inclusivo/exclusivo)
- `reason` text
- `created_at`

### `oauth_tokens`
- `account` text pk (`fran` | `elisa`)
- `access_token` text (cifrado AES-GCM)
- `refresh_token` text (cifrado AES-GCM)
- `expires_at` timestamptz
- `scopes` text[]

### `settings` (`key` pk, `value` jsonb)
- `access_code_hash` (bcrypt)
- `auto_confirm` bool, default `false`
- `min_notice_days` int, default `3`
- `max_stay_days` int, default `14`
- `max_guests` int, default `4`

### RLS
Todas las tablas: lectura/escritura solo con `service_role`. Los guests
interactúan a través de la API; nunca tocan Supabase directamente desde el
browser.

## 6. Flujos

### 6.1 Acceso de guest
1. `/` muestra mensaje + input de código.
2. `POST /api/access` valida bcrypt → setea cookie `gh-access` (JWT firmado,
   30 días, HttpOnly + Secure + SameSite=Lax).
3. Redirige a `/calendar`.

### 6.2 Crear reserva
1. Guest selecciona rango en el calendario y rellena el formulario.
2. `POST /api/bookings`:
   - Verifica cookie de acceso.
   - Valida reglas (`min_notice_days`, `max_stay_days`, `max_guests`).
   - Valida no-solapamiento con `bookings` activas y `blocked_periods` en
     una transacción `SERIALIZABLE` (la constraint GiST es la red de
     seguridad final).
   - Inserta `pending`.
   - Si `auto_confirm = true` → ejecuta flujo de confirmación.
   - Email al guest (pendiente o confirmada).
   - Mensaje a Telegram a los owners.
3. Owner aprueba/rechaza desde `/admin/bookings`.

### 6.3 Confirmación → Google Calendar
1. Owner pulsa "Confirmar".
2. Server obtiene tokens de `fran` y `elisa`, refresca si hace falta.
3. Crea evento all-day en cada calendario:
   - **Título**: `Visita: {guest_name} ({guests_count} pers.)`
   - **Descripción**: notas + email del guest.
   - **Fechas**: `start_date` → `end_date` (Google all-day usa fin
     exclusivo, encaja).
   - **Reminder**: 1 día antes.
4. Guarda `google_event_id_fran` y `google_event_id_elisa`.
5. `status = confirmed`.
6. Email al guest con detalles + link de cancelación firmado.
7. Si falla la creación en uno de los dos calendarios → borrar el otro y
   volver a `pending` con error visible al owner (compensación).

### 6.4 Cancelación
- Disparable por owner o por guest (link firmado).
- Borra eventos en ambos calendarios.
- `status = cancelled`.
- Notificaciones al otro lado.

### 6.5 Bloqueo manual
- `/admin/blocks`: el owner añade rangos con motivo.
- Si hay `bookings pending` que solapan, se listan en un aviso para
  resolverlas a mano.

### 6.6 (v2) Sync inverso desde Google
- Si los owners marcan eventos en su calendario con un tag (p.ej. `#bloqueo`),
  un job los inserta en `blocked_periods`. Vía polling cada N minutos o
  Google push notifications.

## 7. Endpoints API

```
# públicos
POST   /api/access                          set cookie tras validar código
GET    /api/availability?from&to            disponibilidad agregada
POST   /api/bookings                        crear (cookie required)
GET    /api/bookings/[id]?token=...         detalle propio (token firmado)
POST   /api/bookings/[id]/cancel?token=...  cancelar (token firmado)

# admin (Supabase Auth)
GET    /api/admin/bookings
POST   /api/admin/bookings/[id]/confirm
POST   /api/admin/bookings/[id]/reject
GET    /api/admin/blocks
POST   /api/admin/blocks
DELETE /api/admin/blocks/[id]
GET    /api/admin/google/connect/[account]  inicia OAuth para fran|elisa
GET    /api/admin/google/callback           guarda tokens cifrados
GET    /api/admin/settings
POST   /api/admin/settings
```

## 8. UI

### Públicas
- `/` — landing + input de código.
- `/calendar` — calendario interactivo + form de reserva + feedback.
- `/booking/[token]` — detalle de reserva propia con botón cancelar.

### Admin (`/admin/*`)
- `/admin` — dashboard: próximas visitas, pendientes a aprobar.
- `/admin/bookings` — listado con filtros y acciones.
- `/admin/blocks` — alta/baja de bloqueos.
- `/admin/settings` — código acceso, reglas, conexión Google por owner.

### Componentes clave
- `<AvailabilityCalendar />` con días pintados según estado.
- `<BookingForm />` con validación cliente (Zod) + servidor.
- `<BookingCard />` reusable en listado y detalle.
- Toasts con `sonner`.

## 9. Integración Google Calendar

- **Scopes**: `https://www.googleapis.com/auth/calendar.events`.
- **Flow**: Authorization Code + PKCE; callback `/api/admin/google/callback`.
- `refresh_token` cifrado con AES-GCM (clave en `GOOGLE_TOKENS_ENC_KEY`).
- Soportar rotación de refresh token (Google a veces lo rota).
- Wrapper `googleClient(account)` en `lib/google/client.ts` devuelve cliente
  ya refrescado y persiste tokens nuevos.
- Cada owner conecta su cuenta una vez desde `/admin/settings`.

## 10. Variables de entorno

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_TOKENS_ENC_KEY=          # 32 bytes en base64 para AES-GCM

# Notificaciones
TELEGRAM_BOT_TOKEN=             # token del bot creado con @BotFather
TELEGRAM_CHAT_ID=               # id del grupo de Telegram con Fran + Elisa
RESEND_API_KEY=
RESEND_FROM=                    # p.ej. tomasa@franbarea.dev (verificar dominio en Resend)

# Firmas
ACCESS_COOKIE_SECRET=
BOOKING_TOKEN_SECRET=
```

## 11. Estructura del repo

```
src/
  app/
    (public)/
      page.tsx
      calendar/page.tsx
      booking/[token]/page.tsx
    (admin)/
      admin/
        page.tsx
        bookings/page.tsx
        blocks/page.tsx
        settings/page.tsx
    api/
      access/route.ts
      availability/route.ts
      bookings/route.ts
      bookings/[id]/route.ts
      bookings/[id]/cancel/route.ts
      admin/
        bookings/...
        blocks/...
        google/connect/[account]/route.ts
        google/callback/route.ts
        settings/route.ts
  lib/
    supabase/{server,admin}.ts
    google/{client,calendar}.ts
    crypto.ts                # AES-GCM helpers
    notify/{telegram,email}.ts
    auth/{access,admin}.ts
    validation/booking.ts    # zod schemas
    rules.ts                 # min_notice_days, etc.
  components/
  types/
supabase/
  migrations/
docs/
  PRIVACY.md
  RUNBOOK.md
```

## 12. Reglas de negocio configurables

| clave             | default | uso                                          |
|-------------------|---------|----------------------------------------------|
| `min_notice_days` | 3       | mínimo de antelación para reservar           |
| `max_stay_days`   | 14      | duración máxima                              |
| `max_guests`      | 4       | máximo número de personas por reserva        |
| `auto_confirm`    | false   | si true, salta el paso de aprobación manual  |

## 13. Validaciones (Zod, server-side)

- `start_date >= hoy + min_notice_days`
- `(end_date - start_date) <= max_stay_days`
- `guests_count <= max_guests`
- email válido, nombre 2..80 chars
- notas <= 1000 chars
- no-solapamiento (cinturón aplicación + tirantes constraint GiST)

## 14. Seguridad

- Cookies HttpOnly + Secure + SameSite=Lax.
- `service_role` solo en server.
- Refresh tokens cifrados en DB (AES-GCM, IV aleatorio por registro).
- Rate limit en `/api/access` y `/api/bookings` (tabla `rate_limits` o Upstash).
- Bcrypt cost 12 para `access_code`.
- CSRF: Server Actions o tokens explícitos en mutaciones.
- Auditoría: tabla `booking_events` con cambios de estado (id, booking_id,
  from, to, actor, at).

## 15. Decisiones abiertas

- Código único compartido vs. uno por invitado. **v1: único.**
- ¿Eventos en un calendario familiar compartido o uno en cada cuenta?
  **Uno en cada cuenta** (máxima visibilidad en cada móvil).
- ¿Permitir solape entre reservas? **No en v1.**
- Habitaciones múltiples / capacidad agregada por noche. **No en v1.**

> Decisión cerrada: los guests **sí ven** las fechas ocupadas o bloqueadas
> en el calendario, pero **nunca** el nombre de quién reservó ni el motivo
> del bloqueo. La API de disponibilidad devuelve solo `{date, status}`.
