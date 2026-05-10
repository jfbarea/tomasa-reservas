# RUNBOOK

## Rotar `GOOGLE_TOKENS_ENC_KEY`

1. Genera nueva clave: `NEW_KEY=$(openssl rand -base64 32)`
2. Re-cifra todos los tokens existentes:
   ```sql
   -- Exporta los tokens actuales con la clave vieja
   -- Importa re-cifrados con la nueva clave
   ```
   O usa un script: `GOOGLE_TOKENS_ENC_KEY_OLD=<vieja> GOOGLE_TOKENS_ENC_KEY=<nueva> tsx scripts/rotate-enc-key.ts`
3. Actualiza la variable de entorno en Netlify y redesplega.

## Si Google revoca el refresh_token

1. El usuario (Fran o Elisa) verá un error al intentar confirmar una reserva.
2. Ve a `/admin/settings` y pulsa "Conectar Google" para la cuenta afectada.
3. Esto inicia el flujo OAuth y obtiene nuevos tokens.

## Purgar reservas obsoletas

```sql
-- Reservas canceladas o pendientes de más de 1 año
DELETE FROM bookings
WHERE status IN ('cancelled', 'pending')
  AND created_at < NOW() - INTERVAL '1 year';

-- Eventos de auditoría viejos
DELETE FROM booking_events
WHERE at < NOW() - INTERVAL '2 years';

-- Rate limits viejos
DELETE FROM rate_limits WHERE ts < NOW() - INTERVAL '1 day';
```

## Cambiar el código de acceso

```bash
SEED_ACCESS_CODE='nuevo-codigo' DATABASE_URL=... pnpm db:seed
```

El comando actualiza el hash en `settings` usando `ON CONFLICT DO UPDATE`.
Comparte el nuevo código con los invitados manualmente.
