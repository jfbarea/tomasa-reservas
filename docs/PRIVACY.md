# Política de privacidad

## Datos recogidos

- **Nombre y email del guest**: necesarios para gestionar la reserva y enviar confirmaciones.
- **Fechas y número de huéspedes**: datos de la reserva.
- **Notas opcionales**: información adicional facilitada voluntariamente.
- **Tokens OAuth de Google**: cifrados con AES-256-GCM, almacenados para sincronizar calendarios.

## Base legal

Interés legítimo del titular del alojamiento para coordinar visitas y evitar conflictos de disponibilidad.

## Retención

- Los datos de reservas se conservan durante la estancia y hasta 1 año después.
- Los tokens OAuth se eliminan si el owner desconecta su cuenta de Google.
- Los logs de rate limit se eliminan automáticamente tras 24 horas.

## Derechos

Los guests pueden solicitar la eliminación de sus datos contactando directamente con los owners.

## Seguridad

- Comunicaciones cifradas (HTTPS en producción).
- Tokens de refresco de Google cifrados en base de datos (AES-256-GCM).
- Acceso a la app restringido por código compartido.
- Row-Level Security habilitado en todas las tablas de la base de datos.
