# Dashboard — métricas 24h Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar dos métricas al dashboard del admin panel — dispositivos conectados en las últimas 24h y usuarios activos en las últimas 24h.

**Architecture:** Extender el endpoint existente `GET /admin/analytics/overview` con dos queries adicionales contra columnas que ya existen (`devices.last_time_connected`, `users.last_login_at`). El frontend agrega dos StatCards al grid del dashboard y cambia el layout a 2 filas × 3 columnas.

**Tech Stack:** Cloudflare Workers + D1 (SQLite) + TypeScript para el backend; React 19 + Vite + Tailwind + lucide-react para el frontend.

---

## File Structure

**Backend — `C:/proyectos/bloomitCloudflare/admin-api/`:**

- Modify: `src/routes/analytics.ts` — extender `handleAnalyticsOverview`.
- Modify: `tests/routes/analytics.test.ts` — actualizar tests del overview para el shape nuevo.

**Frontend — `C:/proyectos/bloomit-admin/`:**

- Modify: `src/services/adminApi.ts` — extender interface `OverviewData`.
- Modify: `src/pages/DashboardPage.tsx` — agregar 2 StatCards + cambiar grid.

---

## Task 1: Backend — extender tests del overview (failing)

**Files:**
- Test: `C:/proyectos/bloomitCloudflare/admin-api/tests/routes/analytics.test.ts`

- [ ] **Step 1: Actualizar test "returns aggregate counts" con 2 mocks y 2 aserciones nuevas**

Reemplazar el bloque del test `'returns aggregate counts'` (líneas ~31-51) por:

```typescript
it('returns aggregate counts', async () => {
  const env = makeEnv();
  env.DB.first
    .mockResolvedValueOnce({ total: 42 })                    // users total
    .mockResolvedValueOnce({ total: 10, active: 7 })         // devices total/active
    .mockResolvedValueOnce({ total: 55 })                    // sensors last 24h
    .mockResolvedValueOnce({ total: 3 })                     // pending requests
    .mockResolvedValueOnce({ total: 6 })                     // devices connected 24h
    .mockResolvedValueOnce({ total: 18 });                   // users active 24h

  const req = new Request('https://admin-api/admin/analytics/overview');
  const res = await handleAnalyticsOverview(req, env, adminCtx);
  const body = await res.json() as any;

  expect(res.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.data.users.total).toBe(42);
  expect(body.data.users.active_last_24h).toBe(18);
  expect(body.data.devices.total).toBe(10);
  expect(body.data.devices.active).toBe(7);
  expect(body.data.devices.inactive).toBe(3);
  expect(body.data.devices.connected_last_24h).toBe(6);
  expect(body.data.sensors_last_24h).toBe(55);
  expect(body.data.plant_requests_pending).toBe(3);
});
```

- [ ] **Step 2: Actualizar test "defaults to 0 when queries return null" con 2 mocks/aserciones nuevas**

Reemplazar el bloque `'defaults to 0 when queries return null'` (líneas ~53-70) por:

```typescript
it('defaults to 0 when queries return null', async () => {
  const env = makeEnv();
  env.DB.first
    .mockResolvedValueOnce(null)   // users total
    .mockResolvedValueOnce(null)   // devices
    .mockResolvedValueOnce(null)   // sensors 24h
    .mockResolvedValueOnce(null)   // pending requests
    .mockResolvedValueOnce(null)   // devices connected 24h
    .mockResolvedValueOnce(null);  // users active 24h

  const req = new Request('https://admin-api/admin/analytics/overview');
  const res = await handleAnalyticsOverview(req, env, adminCtx);
  const body = await res.json() as any;

  expect(res.status).toBe(200);
  expect(body.data.users.total).toBe(0);
  expect(body.data.users.active_last_24h).toBe(0);
  expect(body.data.devices.total).toBe(0);
  expect(body.data.devices.connected_last_24h).toBe(0);
  expect(body.data.sensors_last_24h).toBe(0);
  expect(body.data.plant_requests_pending).toBe(0);
});
```

(El test `'returns 500 on DB error'` no requiere cambios.)

- [ ] **Step 3: Correr los tests para confirmar que fallan**

```bash
cd C:/proyectos/bloomitCloudflare/admin-api
npm test -- tests/routes/analytics.test.ts
```

Expected: FAIL en ambos tests del `handleAnalyticsOverview` (el shape nuevo no existe todavía). Los otros tests del archivo siguen pasando.

---

## Task 2: Backend — implementar las queries nuevas en el overview

**Files:**
- Modify: `C:/proyectos/bloomitCloudflare/admin-api/src/routes/analytics.ts` (líneas 18-55)

- [ ] **Step 1: Extender `handleAnalyticsOverview` con 2 queries y campos nuevos en la respuesta**

Reemplazar el cuerpo de la función `handleAnalyticsOverview` (líneas 18-55) por:

```typescript
export async function handleAnalyticsOverview(
  request: Request,
  env: Env,
  _context: AdminRequestContext
): Promise<Response> {
  try {
    const db = (env as any).DB as D1Database;
    const since24h = Math.floor(Date.now() / 1000) - 86400;

    const [
      usersResult,
      devicesResult,
      activeSensors,
      pendingRequests,
      devicesConnected24h,
      usersActive24h,
    ] = await Promise.all([
      db.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>(),
      db.prepare('SELECT COUNT(*) as total, SUM(is_active) as active FROM devices').first<{ total: number; active: number }>(),
      db.prepare(
        'SELECT COUNT(*) as total FROM sensors WHERE created_at >= ?1'
      ).bind(since24h).first<{ total: number }>(),
      db.prepare(
        "SELECT COUNT(*) as total FROM plant_requests WHERE status = 'pending'"
      ).first<{ total: number }>(),
      db.prepare(
        'SELECT COUNT(*) as total FROM devices WHERE last_time_connected >= ?1'
      ).bind(since24h).first<{ total: number }>(),
      db.prepare(
        'SELECT COUNT(*) as total FROM users WHERE last_login_at >= ?1'
      ).bind(since24h).first<{ total: number }>(),
    ]);

    return jsonResponse({
      success: true,
      data: {
        users: {
          total: usersResult?.total ?? 0,
          active_last_24h: usersActive24h?.total ?? 0,
        },
        devices: {
          total: devicesResult?.total ?? 0,
          active: devicesResult?.active ?? 0,
          inactive: (devicesResult?.total ?? 0) - (devicesResult?.active ?? 0),
          connected_last_24h: devicesConnected24h?.total ?? 0,
        },
        sensors_last_24h: activeSensors?.total ?? 0,
        plant_requests_pending: pendingRequests?.total ?? 0,
      },
      timestamp: new Date().toISOString(),
    }, 200, request);
  } catch (error) {
    console.error('Analytics overview error:', error);
    return jsonResponse({ success: false, error: 'Failed to get analytics' }, 500, request);
  }
}
```

- [ ] **Step 2: Correr los tests — deben pasar ahora**

```bash
cd C:/proyectos/bloomitCloudflare/admin-api
npm test -- tests/routes/analytics.test.ts
```

Expected: PASS en todos los tests del archivo (incluidos los 3 de `handleAnalyticsOverview`).

- [ ] **Step 3: Correr toda la suite del admin-api para confirmar que no rompió nada**

```bash
cd C:/proyectos/bloomitCloudflare/admin-api
npm test
```

Expected: PASS en toda la suite.

- [ ] **Step 4: Commit backend**

```bash
cd C:/proyectos/bloomitCloudflare
git add admin-api/src/routes/analytics.ts admin-api/tests/routes/analytics.test.ts
git commit -m "feat(admin-api): add 24h connected devices and active users to overview"
```

---

## Task 3: Frontend — extender el tipo `OverviewData`

**Files:**
- Modify: `C:/proyectos/bloomit-admin/src/services/adminApi.ts` (líneas 48-53)

- [ ] **Step 1: Reemplazar la interface `OverviewData`**

Reemplazar el bloque (líneas 48-53) por:

```typescript
export interface OverviewData {
  users: {
    total: number;
    active_last_24h: number;
  };
  devices: {
    total: number;
    active: number;
    inactive: number;
    connected_last_24h: number;
  };
  sensors_last_24h: number;
  plant_requests_pending: number;
}
```

- [ ] **Step 2: Verificar que TypeScript reporta los errores esperados en el dashboard**

```bash
cd C:/proyectos/bloomit-admin
npx tsc --noEmit
```

Expected: PASS (nada en `DashboardPage.tsx` lee los campos nuevos todavía, y los existentes no cambiaron, así que compila).

---

## Task 4: Frontend — agregar las 2 StatCards al dashboard y cambiar el grid

**Files:**
- Modify: `C:/proyectos/bloomit-admin/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Actualizar el import de íconos de lucide-react**

Reemplazar la línea 2:

```typescript
import { Users, Cpu, Activity, Clock, UserCheck, Wifi } from 'lucide-react';
```

- [ ] **Step 2: Cambiar el grid y reemplazar el bloque de StatCards**

Reemplazar el bloque `{/* Stats grid */}` (líneas 78-106) por:

```tsx
      {/* Stats grid — 2 filas x 3 columnas en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Usuarios registrados"
          value={overview?.users.total ?? 0}
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Usuarios activos 24h"
          value={overview?.users.active_last_24h ?? 0}
          subtitle="con login reciente"
          icon={<UserCheck className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Solicitudes pendientes"
          value={overview?.plant_requests_pending ?? 0}
          subtitle="plantas por aprobar"
          icon={<Clock className="w-5 h-5 text-accent-yellow-dark" />}
          iconBg="bg-accent-yellow/20"
        />
        <StatCard
          title="Dispositivos activos"
          value={overview?.devices.active ?? 0}
          subtitle={`${overview?.devices.total ?? 0} total`}
          icon={<Cpu className="w-5 h-5 text-secondary-dark" />}
          iconBg="bg-secondary/10"
        />
        <StatCard
          title="Dispositivos conectados 24h"
          value={overview?.devices.connected_last_24h ?? 0}
          subtitle="con handshake reciente"
          icon={<Wifi className="w-5 h-5 text-secondary-dark" />}
          iconBg="bg-secondary/10"
        />
        <StatCard
          title="Lecturas últimas 24h"
          value={overview?.sensors_last_24h ?? 0}
          icon={<Activity className="w-5 h-5 text-primary-light" />}
          iconBg="bg-accent-mint/30"
        />
      </div>
```

- [ ] **Step 3: Correr el typecheck**

```bash
cd C:/proyectos/bloomit-admin
npx tsc --noEmit
```

Expected: PASS sin errores.

- [ ] **Step 4: Correr el build completo**

```bash
cd C:/proyectos/bloomit-admin
npm run build
```

Expected: PASS — el build termina sin errores.

- [ ] **Step 5: Arrancar el dev server y verificar visualmente**

```bash
cd C:/proyectos/bloomit-admin
npm run dev
```

Abrir `http://localhost:5173` (o el puerto que reporte Vite), loguearse, ir al dashboard. Verificar:
- Se renderizan 6 cards en 2 filas de 3 en desktop (≥ lg breakpoint).
- Los dos cards nuevos muestran números (no `undefined` ni NaN).
- La consola del navegador no tiene errores.
- En mobile (< md) las cards quedan en 1 columna; en md 2 columnas; en lg 3 columnas.

Si algún card nuevo muestra 0, chequear en DevTools la respuesta JSON de `/admin/analytics/overview` — debe contener `users.active_last_24h` y `devices.connected_last_24h`. Si los campos vienen correctos pero el valor es 0, es un estado real (no hubo actividad o `last_time_connected` / `last_login_at` no están siendo poblados en esa BD).

- [ ] **Step 6: Commit frontend**

```bash
cd C:/proyectos/bloomit-admin
git add src/services/adminApi.ts src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add 24h connected devices and active users stat cards"
```

---

## Self-Review Notes

- **Spec coverage:** las 2 métricas están cubiertas por Task 2 (backend) + Task 4 (frontend). Tipos por Task 3. Tests por Task 1 + 2.
- **Shape de API:** `users.active_last_24h` y `devices.connected_last_24h` — consistente entre spec, tests, backend handler y tipo frontend.
- **Orden de `Promise.all`** en Task 2 coincide con el orden de `mockResolvedValueOnce` en Task 1.
- **Grid:** `lg:grid-cols-3` — 2 filas × 3 columnas como pidió el usuario. Sin `xl:grid-cols-6`.
