# Dashboard — métricas 24h (dispositivos conectados + usuarios activos)

**Fecha:** 2026-04-22
**Estado:** Aprobado para implementar

## Objetivo

Agregar dos métricas al dashboard del admin panel:

- **Dispositivos conectados últimas 24h** — cuenta de devices con `last_time_connected` dentro de la ventana.
- **Usuarios activos últimas 24h** — cuenta de users con `last_login_at` dentro de la ventana.

## Motivación

El dashboard actual muestra totales acumulados (usuarios registrados, dispositivos activos) y volumen de lecturas 24h, pero no tiene señal de *presencia reciente*. Estas dos métricas permiten a los admins ver a simple vista cuántos usuarios y devices tuvieron actividad real en el último día.

## Alcance

### Dentro

- Extender `GET /admin/analytics/overview` en `admin-api` con las dos nuevas métricas.
- Extender el tipo `OverviewData` y el render del dashboard en `bloomit-admin`.
- Actualizar tests existentes del endpoint si rompen por cambio de shape.

### Fuera

- Cambios de schema (las columnas `last_time_connected` y `last_login_at` ya existen).
- Nuevos endpoints.
- Gráficos o series temporales.
- Definir "conectado" como "envió lecturas" (se usa `last_time_connected`, ya poblada por el handshake del device).

## Semántica de las métricas

- **Dispositivo conectado últimas 24h:** `last_time_connected >= (now - 86400)`. Refleja presencia (handshake/heartbeat), no volumen de datos. La tarjeta existente "Lecturas últimas 24h" ya cubre volumen.
- **Usuario activo últimas 24h:** `last_login_at >= (now - 86400)`. Usuarios con `last_login_at IS NULL` (pre-existentes sin login) no cuentan — coincide con la definición natural de "activo".

## Backend — `bloomitCloudflare/admin-api/src/routes/analytics.ts`

Extender `handleAnalyticsOverview` agregando dos queries al `Promise.all` existente:

```sql
-- dispositivos conectados últimas 24h
SELECT COUNT(*) as total FROM devices WHERE last_time_connected >= ?1

-- usuarios activos últimas 24h
SELECT COUNT(*) as total FROM users WHERE last_login_at >= ?1
```

El bind (`Math.floor(Date.now() / 1000) - 86400`) es el mismo que ya se usa para `sensors_last_24h` — se calcula una sola vez y se reutiliza.

Nuevo shape de respuesta:

```ts
{
  users: {
    total: number,
    active_last_24h: number  // NUEVO
  },
  devices: {
    total: number,
    active: number,
    inactive: number,
    connected_last_24h: number  // NUEVO
  },
  sensors_last_24h: number,
  plant_requests_pending: number
}
```

Cambio no-breaking desde el punto de vista de campos existentes (solo se agregan dos). Los tests del endpoint hay que actualizarlos para el nuevo shape.

## Frontend — `bloomit-admin`

### `src/services/adminApi.ts`

Extender `OverviewData`:

```ts
export interface OverviewData {
  users: { total: number; active_last_24h: number };
  devices: { total: number; active: number; inactive: number; connected_last_24h: number };
  sensors_last_24h: number;
  plant_requests_pending: number;
}
```

### `src/pages/DashboardPage.tsx`

- Cambiar grid: `lg:grid-cols-4` → `lg:grid-cols-3` (2 filas de 3 en desktop).
- Agregar 2 StatCards nuevas.

Orden final de las 6 tarjetas:

1. Usuarios registrados
2. Usuarios activos 24h *(nueva)*
3. Solicitudes pendientes
4. Dispositivos activos
5. Dispositivos conectados 24h *(nueva)*
6. Lecturas últimas 24h

(Primera fila: usuarios + solicitudes. Segunda fila: devices + sensores. Agrupación temática.)

Íconos e iconBg a definir en implementación usando los ya disponibles de `lucide-react` y la paleta Tailwind del proyecto (coherente con los existentes).

## Plan de verificación

- **Backend:** hit manual a `/admin/analytics/overview` con un token de admin válido; confirmar que el JSON incluye `users.active_last_24h` y `devices.connected_last_24h` con valores numéricos.
- **Frontend:** `npm run dev` en `bloomit-admin`, abrir `/dashboard` logueado, verificar que se renderizan las 6 cards en 2 filas de 3 sin errores de consola.
- **Tipos:** `npm run build` debe pasar sin errores TS.

## Riesgos

- **Tests backend pueden romper** por el cambio de shape. Mitigación: correr la suite después del cambio y actualizar los snapshots / asserts.
- **`last_time_connected` puede no estar actualizándose correctamente** desde los ESP32 en producción. Si la métrica da 0 consistentemente con devices activos, es una señal de que el handshake no está escribiendo la columna — fuera del alcance de este spec, pero hay que chequearlo al verificar.
