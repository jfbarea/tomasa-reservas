# tomasa-reservas

App personal para gestionar visitas de amigos a la nueva casa en Granada.

## Estado del proyecto

Implementación inicial completa. 76 tests verdes, build sin errores.

## Requisitos

- Node 20+
- pnpm 9+
- Docker (recomendado para Postgres local; sin Docker los tests de DB no funcionan)

## Quickstart (sin servicios externos)

```bash
git clone <repo>
cd tomasa-reservas
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
# Abre http://localhost:3000  Código de acceso por defecto: tomasa-dev
```

## Tests

```bash
pnpm test            # full: db + unit + build + e2e
pnpm test:unit       # unit + api + dom
pnpm test:e2e        # playwright e2e
```

## Configuración (variables de entorno)

| Nombre | Obligatoria | Dónde se obtiene |
|--------|-------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Producción | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Producción | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Producción | Supabase → Project Settings → API |
| `DATABASE_URL` | Siempre | URL de conexión PostgreSQL |
| `GOOGLE_CLIENT_ID` | Producción | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Producción | Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | Producción | `https://tomasa.franbarea.dev/api/admin/google/callback` |
| `GOOGLE_TOKENS_ENC_KEY` | Siempre | `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN` | Producción | @BotFather en Telegram |
| `TELEGRAM_CHAT_ID` | Producción | ID del grupo de Telegram |
| `RESEND_API_KEY` | Producción | Resend dashboard |
| `RESEND_FROM` | Producción | `tomasa@franbarea.dev` |
| `ACCESS_COOKIE_SECRET` | Siempre | `openssl rand -hex 64` |
| `BOOKING_TOKEN_SECRET` | Siempre | `openssl rand -hex 64` |
| `ADAPTERS` | Siempre | `memory` (dev/test) o `real` (producción) |

## Activar producción (lo que TÚ tienes que hacer al despertar)

Estos pasos son lo único que requiere intervención humana. Sigue el
orden, copia los valores en `.env.production` (o en Netlify Env).

### 1. Supabase

- Crea proyecto en https://supabase.com
- Project Settings → API → copia `Project URL` y `service_role` key.
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Database connection string del pooler → `DATABASE_URL=postgres://…`.
- Aplica migraciones: `DATABASE_URL=… pnpm db:migrate`.
- Aplica seed: `SEED_ACCESS_CODE='tu-codigo' DATABASE_URL=… pnpm db:seed`

### 2. Google Calendar

- Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (tipo: Web).
- Authorized redirect URI: `https://tomasa.franbarea.dev/api/admin/google/callback`.
- Habilitar API "Google Calendar API".
- Copia `Client ID` y `Client Secret` a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- `GOOGLE_REDIRECT_URI=https://tomasa.franbarea.dev/api/admin/google/callback`
- `GOOGLE_TOKENS_ENC_KEY=$(openssl rand -base64 32)`
- Una vez desplegado, entra a `/admin/settings` y conecta cada cuenta (fran y elisa) pulsando "Conectar Google".

### 3. Telegram

- Crea bot con @BotFather → `/newbot`. Guarda el token en `TELEGRAM_BOT_TOKEN`.
- Crea grupo con Fran + Elisa, añade el bot.
- Obtén `chat_id`: envía un mensaje al grupo, abre
  `https://api.telegram.org/bot<TOKEN>/getUpdates`,
  copia `chat.id` (es negativo). Ponlo en `TELEGRAM_CHAT_ID`.

### 4. Resend

- Crea cuenta en https://resend.com.
- Verifica dominio `franbarea.dev` (DNS records que Resend te da).
- Crea API key → `RESEND_API_KEY`.
- `RESEND_FROM=tomasa@franbarea.dev`

### 5. Secrets de la app

```bash
ACCESS_COOKIE_SECRET=$(openssl rand -hex 64)
BOOKING_TOKEN_SECRET=$(openssl rand -hex 64)
```

### 6. Código de acceso real

```bash
SEED_ACCESS_CODE='<código que vas a compartir>' DATABASE_URL=… pnpm db:seed
```

### Despliegue Netlify

- Conectar repo, plugin `@netlify/plugin-nextjs`.
- Pega todas las variables anteriores en Netlify Env.
- `ADAPTERS=real` (importante).
- Domain → custom domain `tomasa.franbarea.dev` con CNAME a Netlify.

## Estructura

```
src/
  app/
    (public)/          # Páginas para guests
    (admin)/admin/     # Panel de administración
    api/               # Route Handlers
  lib/
    auth/              # Cookies de acceso y admin
    booking/           # Lógica de confirmación
    crypto.ts          # AES-GCM + JWT + bcrypt
    db/                # Pool y repositorios
    adapters/          # Inmemory (dev/test) y real (prod)
    ports/             # Interfaces CalendarPort, NotifyPort
    rules.ts           # Validaciones de negocio
    validation/        # Esquemas Zod
  components/          # Componentes React
  types/               # Tipos TypeScript compartidos
supabase/migrations/   # Migraciones SQL (0001-0009)
tests/                 # Suite de tests
docs/                  # RUNBOOK y PRIVACY
```

## Decisiones

Ver SPEC.md §15.
