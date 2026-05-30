# PLAN.md — Ejecución autónoma de `tomasa-reservas`

> Este plan está pensado para que un **agente** (Claude Code) lo ejecute de
> principio a fin **sin intervención del usuario**. El usuario lo lanza,
> se va a dormir, y al despertar encuentra:
>
> - Repo desarrollado, compilando (`pnpm build`).
> - Suite de tests verde que valida toda la SPEC (`pnpm test`).
> - `README.md` claro con dos bloques: **Quickstart** (corre en local sin
>   credenciales reales) y **Producción** (qué credenciales debe poner el
>   usuario para activar Google / Supabase / Telegram / Resend).
> - Un único commit en `main` con el trabajo.
> - Si algo no se pudo completar: un `BLOCKERS.md` con la lista exacta de
>   qué quedó pendiente y por qué (nunca dejar el repo en estado roto).

---

## 0. Contrato de ejecución autónoma

El agente que ejecuta este plan opera bajo estas reglas. Si en algún
momento siente la necesidad de "preguntar al usuario", la respuesta es
**no**: aplicar la regla por defecto correspondiente y continuar.

### 0.1 Cero interacción

- Prohibido `AskUserQuestion`, prohibido cualquier `prompt` interactivo
  de CLI (ej. `create-next-app` sin flags). Usar siempre flags
  no-interactivas o construir ficheros a mano.
- Prohibido pedir aprobación del usuario entre fases. El agente **es** el
  que aprueba, ejecutando el "exit gate" (§0.4) de cada fase.
- Prohibido detenerse a "esperar confirmación". Ante ambigüedad: tomar
  la decisión que más se acerque a la SPEC y dejar nota en el commit.

### 0.2 Decisiones por defecto (ya tomadas, no preguntar)

- **Stack**: el de SPEC §4. Sin sustituciones.
- **Package manager**: `pnpm`.
- **Node**: 20.
- **Adaptadores externos**: `ADAPTERS=memory` para dev y tests. Los
  adaptadores `real` (Google, Telegram, Resend) quedan implementados pero
  no se ejercitan en CI; los tests usan los `inmemory`.
- **Base de datos local**: Postgres 16 en Docker (compose). Si Docker no
  está disponible (§0.6), usar `pg-mem` con un shim que emule
  `btree_gist` (los tests de exclusion constraint se marcan
  `it.skipIf(NO_DOCKER)`). El agente decide automáticamente.
- **Código de acceso de seed**: `tomasa-dev`.
- **Fecha "hoy" en tests**: `2026-06-01T10:00:00Z` (mock con
  `vi.useFakeTimers`).
- **Idioma de UI**: español.
- **Git**: una rama, un commit final. Nada de force-push, nada de
  reescribir historia.

### 0.3 Self-verification

Cada fase termina con un **exit gate**: uno o varios comandos shell
cuyo código de salida 0 es la única señal de éxito. El agente ejecuta
el comando, lee la salida y **solo avanza si pasa**. No "interpreta" un
fallo como éxito. No avanza por intuición.

Forma de ejecutar el gate:
```
pnpm <gate-command> 2>&1 | tee .agent/gate-<N>.log
```
y luego comprobar `$?`. La carpeta `.agent/` (gitignored) contiene el
log de cada gate y un `.agent/state.json` con la última fase superada.

### 0.4 Loop de corrección

Si un exit gate falla:

1. El agente lee el log y diagnostica.
2. Aplica una corrección **mínima y dirigida** (no refactor amplio).
3. Vuelve a correr el gate.
4. Máximo **5 intentos** por fase. A los 5 fallos:
   - Anota el problema en `BLOCKERS.md` con: fase, comando, error,
     hipótesis, qué se intentó.
   - **Si la fase es bloqueante** (§§1, 2, 3, 4): para la ejecución y
     hace commit de lo conseguido + `BLOCKERS.md`.
   - **Si no es bloqueante** (§§5–9 de forma parcial): salta a la
     siguiente fase y deja el bloqueo documentado.

Ningún bucle de retry usa `sleep` ciego. Cada retry empieza con una
hipótesis nueva.

### 0.5 Tiempo y proceso

- El usuario se va a dormir → el agente trabaja en background.
- No usar `ScheduleWakeup` ni `loop`: el plan se ejecuta en una sola
  pasada. Tareas largas (build, tests) corren con `Bash` + timeouts
  amplios; nada de despertarse en 8 horas.
- Si una fase tarda más de 15 minutos sin output, abortar la fase
  como fallo y entrar en el loop §0.4.

### 0.6 Detección de entorno

Antes de §1, el agente ejecuta una **fase 0** silenciosa:

```
node --version
pnpm --version || npm i -g pnpm@9
docker --version || echo NO_DOCKER
git --version
```

- Si `pnpm` no está instalado, instalarlo con `npm i -g pnpm@9`.
- Si Docker no está, marcar `NO_DOCKER=1` en `.agent/env` y caer al
  fallback `pg-mem` para los tests de DB. Documentarlo en README como
  "limitación del entorno actual" si aplica.
- Si Node es < 20, abortar con BLOCKERS (no es recuperable sin sudo).

### 0.7 Comunicación al usuario

- El agente **no escribe en chat** durante la ejecución salvo:
  - Mensaje inicial: "Empiezo. Te aviso al terminar."
  - Mensaje final: resumen de lo hecho + ruta al README + lista de
    variables de entorno que el usuario debe rellenar para producción.
- Cualquier "decisión interesante" se anota en el commit message o en
  `BLOCKERS.md`, no en el chat.

---

## 1. Bootstrap del repo

### 1.1 Inicialización

- `pnpm init` con `"name": "tomasa-reservas"`, `"private": true`, `"type": "module"`.
- Añadir `engines: { "node": ">=20", "pnpm": ">=9" }`.
- `.nvmrc` → `20`.
- `.gitignore` (Next.js + node_modules + .env* + coverage + .next + .agent/).
- `.editorconfig` 2 espacios.

### 1.2 Dependencias

`dependencies`:
- `next@14`, `react@18`, `react-dom@18`
- `typescript@5`
- `zod`
- `react-day-picker`, `date-fns`
- `tailwindcss`, `postcss`, `autoprefixer`
- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- `@radix-ui/react-*` (`dialog`, `dropdown-menu`, `label`, `popover`,
  `select`, `slot`, `toast`)
- `sonner`
- `@supabase/supabase-js`
- `pg` + `@types/pg`
- `pg-mem` (fallback NO_DOCKER)
- `googleapis`
- `bcryptjs` + `@types/bcryptjs`
- `jose`
- `resend`

`devDependencies`:
- `@types/node`, `@types/react`, `@types/react-dom`
- `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`,
  `happy-dom`
- `@playwright/test`
- `msw`
- `eslint`, `eslint-config-next`, `@typescript-eslint/*`, `prettier`,
  `eslint-config-prettier`
- `tsx`, `dotenv`

### 1.3 Configuración base

- `tsconfig.json` (`strict: true`, `paths: { "@/*": ["src/*"] }`).
- `next.config.mjs` mínimo.
- `tailwind.config.ts` apuntando a `./src/**/*.{ts,tsx}`.
- `postcss.config.mjs`.
- `.eslintrc.cjs` extendiendo `next/core-web-vitals`, `prettier`.
- `.prettierrc` (single quotes, `semi: false`, `printWidth: 100`).
- `vitest.config.ts` con dos proyectos: `unit` (node) y `dom` (happy-dom).
- `playwright.config.ts` con `webServer: { command: 'pnpm start', port: 3000 }`,
  `baseURL: http://localhost:3000`, browser `chromium`.

### 1.4 Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "db:up": "docker compose up -d db && tsx scripts/wait-for-db.ts",
    "db:down": "docker compose down -v",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:reset": "pnpm db:down && pnpm db:up && pnpm db:migrate",
    "db:seed": "tsx scripts/seed.ts",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test": "tsx scripts/run-full-tests.ts",
    "ci": "pnpm lint && pnpm typecheck && pnpm test",
    "agent:gate": "tsx scripts/agent/gate.ts"
  }
}
```

`scripts/run-full-tests.ts` orquesta: si `NO_DOCKER`, salta `db:reset`;
si no, lo corre. Luego `test:unit`, `build`, `test:e2e`. Esto evita que
el agente tenga que hacer condicionales en bash.

### 1.5 Exit gate fase 1

```
pnpm install --frozen-lockfile=false
pnpm typecheck
pnpm lint
```

Los tres comandos exit 0. Si lint falla por reglas demasiado estrictas
en archivos placeholder, añadir `// @ts-nocheck` solo en `src/_placeholder.ts`
y un `eslint-disable` localizado; **no** relajar reglas globales.

---

## 2. Infra local

### 2.1 `docker-compose.yml`

- Servicio `db`: `postgres:16-alpine`, puerto `5432:5432`,
  envs `POSTGRES_USER=tomasa POSTGRES_PASSWORD=tomasa POSTGRES_DB=tomasa`,
  `command: ["postgres", "-c", "shared_preload_libraries=btree_gist"]`,
  healthcheck `pg_isready -U tomasa`.
- Volumen `tomasa-db-data:/var/lib/postgresql/data`.

### 2.2 Scripts

- `scripts/wait-for-db.ts`: poll `pg.connect()` hasta éxito o 30 s.
- `scripts/migrate.ts`: lee `supabase/migrations/*.sql` por orden,
  crea `_migrations(name pk, applied_at)`, aplica las nuevas en
  transacción.
- `scripts/seed.ts`: inserta `settings` por defecto y
  `access_code_hash = bcrypt('tomasa-dev')` (override con
  `SEED_ACCESS_CODE`).

### 2.3 `.env.example` y `.env.test`

- `.env.example`: SPEC §10 + `DATABASE_URL` + `ADAPTERS=memory` +
  `NODE_ENV=development`. **Nunca** con valores reales.
- `.env.test`: secrets dummy deterministas + `ADAPTERS=memory` +
  `DATABASE_URL` apuntando al compose.

El agente, al inicio de §2, copia `.env.example` a `.env` localmente
(en su carpeta de trabajo, no commit) si no existe, para poder correr
`pnpm dev` durante la verificación.

### 2.4 Exit gate fase 2

Si Docker está:
```
pnpm db:up
pnpm db:migrate
psql "$DATABASE_URL" -tAc "select extname from pg_extension where extname='btree_gist'"
```
La última línea debe imprimir `btree_gist`.

Si NO_DOCKER:
```
tsx scripts/agent/check-pgmem.ts
```
Un script que carga `pg-mem`, registra el shim de `btree_gist`, ejecuta
las migraciones contra el adaptador y verifica que las constraints
EXCLUDE no rompen (porque las simulamos con triggers en el shim).

---

## 3. Modelo de datos

Migraciones en `supabase/migrations/` (numeradas):

1. `0001_extensions.sql` — `CREATE EXTENSION IF NOT EXISTS btree_gist;` +
   `pgcrypto`.
2. `0002_bookings.sql` — tabla `bookings` SPEC §5, enum
   `booking_status`, `bookings_dates_check`, EXCLUDE GiST
   `bookings_no_overlap`.
3. `0003_blocked_periods.sql` — tabla + EXCLUDE GiST.
4. `0004_oauth_tokens.sql` — tabla, enum `account` (`fran`,`elisa`).
5. `0005_settings.sql` — `(key text pk, value jsonb)`.
6. `0006_booking_events.sql` — auditoría.
7. `0007_rate_limits.sql` — `(bucket, key, ts)` + índice.
8. `0008_rls.sql` — `ENABLE ROW LEVEL SECURITY` en todas, sin policies.
9. `0009_block_vs_booking_overlap.sql` — trigger
   `BEFORE INSERT/UPDATE` en `bookings` y `blocked_periods` que
   `RAISE EXCEPTION` si solapan entre sí.

### 3.1 Exit gate fase 3

```
pnpm test:unit -- tests/db/schema.test.ts
```

`schema.test.ts` consulta `pg_constraint`, `pg_type`, `pg_trigger` y
afirma la existencia de cada artefacto.

---

## 4. Capas comunes

Implementar en este orden:

1. `src/lib/crypto.ts` — AES-256-GCM (formato `iv|tag|cipher` base64),
   `signJwt`/`verifyJwt` con `jose` HS256, `hashAccessCode` /
   `verifyAccessCode` (bcrypt cost 12 prod, 4 en test).
2. `src/lib/db/pool.ts` — `pg.Pool` singleton con `DATABASE_URL`.
3. `src/lib/db/repo/{bookings,blocks,settings,oauthTokens,rateLimits,events}.ts`
   con helpers tipados. Escrituras sensibles dentro de
   `BEGIN; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; …; COMMIT;`.
4. `src/lib/ports/{calendar,notify}.ts` interfaces.
5. `src/lib/adapters/inmemory/{calendar,telegram,email}.ts` con
   exports `__events`/`__inbox` para asserts en tests.
6. `src/lib/adapters/real/{google,telegram,resend}.ts` con la
   implementación HTTP real.
7. `src/lib/adapters/index.ts` selección por `ADAPTERS`.
8. `src/lib/validation/booking.ts` esquemas Zod.
9. `src/lib/rules.ts` `assertBookingRules(input, settings, today)`.
10. `src/lib/auth/{access,admin}.ts` cookies firmadas + stub admin
    (acepta `x-test-admin: 1` solo si `NODE_ENV==='test'`).

### 4.1 Exit gate fase 4

```
pnpm test:unit -- tests/unit
```

Cubre: `crypto.test.ts`, `rules.test.ts`, `validation.test.ts`,
`rate-limit.test.ts`, `adapters-inmemory.test.ts`. Cobertura mínima
de `src/lib` ≥ 70% en este punto.

---

## 5. Endpoints (Route Handlers)

Implementar **toda** la lista de SPEC §7. Todos `runtime = 'nodejs'`.

Detalles por endpoint:

- `POST /api/access`: valida `bcrypt`; cookie `gh-access` JWT firmado
  HttpOnly+Secure+SameSite=Lax, TTL 30 d. Rate limit: 5 fallos / 10 min
  / IP → 429.
- `GET /api/availability?from&to`: array `{date, status}` solo, sin nombres.
- `POST /api/bookings`:
  1. Cookie guest válida.
  2. Lee `settings`.
  3. `assertBookingRules`.
  4. Insert dentro de SERIALIZABLE; si SQLSTATE 23P01 (exclusion
     violation) → 409 `{error:'overlap'}`.
  5. Si `auto_confirm=true` → llama a flujo confirm.
  6. Email guest (template "pendiente" o "confirmada").
  7. Telegram a owners.
- `GET /api/bookings/[id]?token=…`: detalle propio (token firmado).
- `POST /api/bookings/[id]/cancel?token=…`: ver §6.4 SPEC.
- Admin (`requireAdmin()`):
  - `GET /api/admin/bookings`
  - `POST /api/admin/bookings/[id]/confirm`:
    1. Crea evento Google `fran`.
    2. Crea evento Google `elisa`.
    3. Si (2) falla → borra (1), `status` queda `pending`,
       guarda `last_error`.
    4. Persiste `google_event_id_*`, `status='confirmed'`.
    5. Email guest con `cancel_token` firmado (60 d, claim `bookingId`).
  - `POST /api/admin/bookings/[id]/reject`
  - `GET /api/admin/blocks`, `POST`, `DELETE`
  - `GET /api/admin/google/connect/[account]` — OAuth + PKCE,
    `code_verifier` en cookie firmada de corta vida.
  - `GET /api/admin/google/callback` — intercambia code, cifra y
    persiste tokens, redirige `/admin/settings?connected=<account>`.
  - `GET/POST /api/admin/settings`.

### 5.1 Exit gate fase 5

```
pnpm test:unit -- tests/api
```

Tests por endpoint listados en §7.

---

## 6. UI

Implementar SPEC §8.

- `<AvailabilityCalendar />` con `react-day-picker`. Días pintados según
  `GET /api/availability`. Bloquea selección sobre `booked`/`blocked`.
- `<BookingForm />` con validación cliente y servidor (mismo Zod).
- `<BookingCard />` reusable.
- `app/(public)/page.tsx` (landing + input de código).
- `app/(public)/calendar/page.tsx`.
- `app/(public)/booking/[token]/page.tsx`.
- `app/(admin)/admin/page.tsx` dashboard.
- `app/(admin)/admin/{bookings,blocks,settings}/page.tsx`.
- `src/components/ui/*` shadcn-equivalentes generados a mano (Button,
  Input, Label, Dialog, Select, Toast).

### 6.1 Exit gate fase 6

```
pnpm build
pnpm test:unit -- tests/dom
```

`tests/dom` cubre:
- Calendar deshabilita días no disponibles.
- Form muestra errores Zod.
- BookingCard renderiza estados.

---

## 7. Suite que valida la SPEC entera

### 7.1 Estructura

```
tests/
  db/schema.test.ts                 # §5 schema y constraints
  unit/
    crypto.test.ts
    rules.test.ts
    validation.test.ts
    rate-limit.test.ts
    adapters-inmemory.test.ts
  api/
    access.test.ts                  # §6.1
    availability.test.ts            # §15 cierre: solo {date,status}
    bookings.create.test.ts         # §6.2
    bookings.overlap.test.ts        # §13: cinturón + tirantes GiST
    bookings.rules.test.ts          # §12 reglas
    admin.confirm.test.ts           # §6.3 + compensación
    admin.reject.test.ts
    cancel.guest.test.ts            # §6.4
    cancel.owner.test.ts
    blocks.test.ts                  # §6.5
    google.oauth.test.ts            # §9 PKCE + cifrado
    settings.test.ts
  dom/
    calendar.test.tsx
    booking-form.test.tsx
  e2e/
    happy-path.spec.ts              # acceso → reservar → confirmar → cancelar
    blocked-day.spec.ts
    admin-flow.spec.ts
```

### 7.2 Setup

- `tests/setup/db.ts`: antes de cada archivo `TRUNCATE` y reseed de
  `settings`.
- `tests/setup/clock.ts`: `setSystemTime('2026-06-01T10:00:00Z')`.
- `tests/setup/adapters.ts`: importa inmemory + helpers
  `lastTelegram()`, `lastEmail()`, `googleEvents(account)`.
- `tests/setup/oauth-mock.ts`: servidor MSW que finge endpoints de
  Google OAuth (token, userinfo) para `google.oauth.test.ts`.

### 7.3 Cobertura SPEC ↔ test

| SPEC §          | Test                                            |
|-----------------|-------------------------------------------------|
| §2 objetivos    | e2e `happy-path`                                |
| §5 schema       | `db/schema.test.ts`                             |
| §6.1 acceso     | `api/access.test.ts`                            |
| §6.2 crear      | `bookings.create` + `overlap` + `rules`         |
| §6.3 confirmar  | `admin.confirm` (incluye compensación)          |
| §6.4 cancelar   | `cancel.{guest,owner}.test.ts`                  |
| §6.5 bloqueos   | `blocks.test.ts` + e2e `blocked-day`            |
| §7 endpoints    | un test por endpoint                            |
| §9 OAuth        | `google.oauth.test.ts`                          |
| §12 reglas      | `bookings.rules.test.ts`                        |
| §13 valid.      | `unit/validation.test.ts` + integration         |
| §14 seguridad   | cookies HttpOnly, rate limit, AES round-trip    |
| §15 privacidad  | `availability.test.ts`                          |

### 7.4 Exit gate fase 7

```
pnpm test
```

Criterios:
- 0 fallos en unit + dom + e2e.
- Cobertura `src/lib` ≥ 80% (`vitest --coverage`).
- Si `NO_DOCKER`, los tests etiquetados `@needs-docker` están skipped y
  el agente lo deja anotado en `BLOCKERS.md`.

---

## 8. CI

`.github/workflows/ci.yml`:

- `ubuntu-latest`, Node 20, pnpm 9.
- Servicio `postgres:16` con healthcheck.
- Pasos: setup pnpm, `pnpm install --frozen-lockfile`, `pnpm db:migrate`,
  `pnpm ci`, `playwright install --with-deps chromium`, `pnpm test:e2e`.

### 8.1 Exit gate fase 8

```
pnpm exec yamllint .github/workflows/ci.yml || true
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"
```

Solo se valida que el YAML es parseable; el agente no ejecuta el
workflow.

---

## 9. Documentación

### 9.1 `README.md` raíz

Estructura mínima (el agente la genera con datos reales del repo):

```markdown
# tomasa-reservas

App personal para gestionar visitas de amigos a la nueva casa en Granada.

## Estado del proyecto

[generado por el agente: enlace a último commit, tests verdes, qué quedó
en BLOCKERS.md si lo hay]

## Requisitos

- Node 20+
- pnpm 9+
- Docker (recomendado para Postgres local; sin Docker la app cae a
  pg-mem en tests con limitaciones documentadas)

## Quickstart (sin servicios externos)

git clone …
cd tomasa-reservas
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
# Abre http://localhost:3000  Código de acceso por defecto: tomasa-dev

## Tests

pnpm test            # full: db + unit + build + e2e
pnpm test:unit
pnpm test:e2e

## Configuración (variables de entorno)

Tabla con cada variable de .env.example:
| Nombre | Obligatoria | Dónde se obtiene |

## Activar producción (lo que TÚ tienes que hacer al despertar)

Estos pasos son lo único que requiere intervención humana. Sigue el
orden, copia los valores en `.env.production` (o en Netlify Env).

1. **Supabase**
   - Crea proyecto en https://supabase.com
   - Project Settings → API → copia `Project URL` y `service_role` key.
   - Variables: `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Database connection string del pooler →
     `DATABASE_URL=postgres://…`.
   - Aplica migraciones: `DATABASE_URL=… pnpm db:migrate`.

2. **Google Calendar**
   - Google Cloud Console → APIs & Services → Credentials → OAuth 2.0
     Client ID (tipo: Web).
   - Authorized redirect URI:
     `https://tomasa.franbarea.dev/api/admin/google/callback`.
   - Habilitar API "Google Calendar API".
   - Copia `Client ID` y `Client Secret` a `GOOGLE_CLIENT_ID` /
     `GOOGLE_CLIENT_SECRET`.
   - `GOOGLE_REDIRECT_URI=https://tomasa.franbarea.dev/api/admin/google/callback`.
   - `GOOGLE_TOKENS_ENC_KEY=$(openssl rand -base64 32)`.
   - Una vez desplegado, entra a `/admin/settings` y conecta cada cuenta
     (fran y elisa) pulsando "Conectar Google".

3. **Telegram**
   - Crea bot con @BotFather → `/newbot`. Guarda el token en
     `TELEGRAM_BOT_TOKEN`.
   - Crea grupo con Fran + Elisa, añade el bot.
   - Obtén `chat_id`: envía un mensaje al grupo, abre
     `https://api.telegram.org/bot<TOKEN>/getUpdates`,
     copia `chat.id` (es negativo). Ponlo en `TELEGRAM_CHAT_ID`.

4. **Resend**
   - Crea cuenta en https://resend.com.
   - Verifica dominio `franbarea.dev` (DNS records que Resend te da).
   - Crea API key → `RESEND_API_KEY`.
   - `RESEND_FROM=tomasa@franbarea.dev`.

5. **Secrets de la app**
   - `ACCESS_COOKIE_SECRET=$(openssl rand -hex 64)`
   - `BOOKING_TOKEN_SECRET=$(openssl rand -hex 64)`

6. **Código de acceso real**
   - `SEED_ACCESS_CODE='<código que vas a compartir>' DATABASE_URL=… pnpm db:seed`

7. **Despliegue Netlify**
   - Conectar repo, plugin `@netlify/plugin-nextjs`.
   - Pega todas las variables anteriores en Netlify Env.
   - `ADAPTERS=real` (importante).
   - Domain → custom domain `tomasa.franbarea.dev` con CNAME a Netlify.

## Estructura

[árbol generado por el agente con `tree -L 2 -I node_modules`]

## Decisiones

Ver SPEC.md §15.
```

### 9.2 `docs/RUNBOOK.md`

- Cómo rotar `GOOGLE_TOKENS_ENC_KEY` (re-cifrar registros).
- Qué hacer si Google revoca refresh_token.
- Comandos para purgar reservas obsoletas.
- Cómo cambiar el código de acceso compartido.

### 9.3 `docs/PRIVACY.md`

- Datos guardados, base legal (interés legítimo del titular del
  alojamiento), retención.

### 9.4 Exit gate fase 9

Script `scripts/agent/check-readme.ts` que falla si en `README.md`
faltan secciones por título exacto:
`Requisitos`, `Quickstart`, `Tests`, `Configuración`, `Activar producción`,
`Despliegue Netlify`, `Estructura`. El agente lo arregla y vuelve a
correr.

---

## 10. Cierre y mensaje al usuario

### 10.1 Commit

Tras pasar todos los exit gates:

```
git add -A
git commit -m "feat: initial implementation per SPEC.md

- Next.js 14 + Supabase schema + Google/Telegram/Resend adapters
- Test suite covering SPEC §§5-15
- README with Quickstart and production checklist
"
```

Sin `--no-verify`. Sin force push. Sin push a remote (el usuario decidirá
cuándo y dónde).

### 10.2 Mensaje final al usuario (en chat)

Forma exacta:

```
Hecho. Resumen:

- Tests: <N pasados>/<N totales>, cobertura src/lib <X>%.
- Build: ok.
- Commit: <sha>.

Para usarlo en producción tienes que rellenar variables de entorno
y conectar servicios externos. Está todo listado en README.md sección
"Activar producción". Empieza por Supabase (paso 1), tarda 5 min.

[si BLOCKERS.md existe]
Quedó pendiente: <lista>. Detalle en BLOCKERS.md.
```

---

## 11. Definition of Done

- [ ] `pnpm install` limpio.
- [ ] `pnpm db:reset && pnpm db:migrate` sin errores (o `pg-mem`
      fallback si NO_DOCKER, documentado en BLOCKERS).
- [ ] `pnpm lint` 0 warnings.
- [ ] `pnpm typecheck` 0 errores.
- [ ] `pnpm test` verde, cobertura `src/lib` ≥ 80%.
- [ ] `pnpm build` verde.
- [ ] `pnpm test:e2e` verde (skip e2e si NO_DOCKER, documentado).
- [ ] `README.md` con secciones obligatorias presentes.
- [ ] `.env.example` lista exactamente las variables de SPEC §10 más
      `DATABASE_URL` y `ADAPTERS`.
- [ ] Repo no contiene secrets ni `.env` reales.
- [ ] Un solo commit en `main`.
- [ ] `BLOCKERS.md` o no existe (todo verde) o lista accionables claros.
- [ ] Mensaje final enviado al usuario con el resumen.
