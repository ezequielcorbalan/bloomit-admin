# Notificaciones admin — devolver detalle por falla

**Fecha:** 2026-05-01
**Repo afectado:** `admin-api` (backend)
**Repo cliente:** `bloomit-admin` (ya soporta el campo, ver `src/pages/NotificationsPage.tsx`)

## Objetivo

`POST /admin/notifications/send` debe devolver, junto con el contador `failed`, un array `failures[]` con un item por usuario/token cuyo envío push falló, indicando el motivo. Hoy `failed` viene poblado pero `failures` llega vacío o ausente, así que el admin ve "43 fallidas" sin saber por qué.

## Motivación

Caso real (2026-05-01): se mandó un preset *Suelo seco* a 1 usuario, el backend respondió `sent: 0, failed: 43, failures: []`. El admin no puede distinguir entre:

- Tokens de FCM expirados / `DeviceNotRegistered`
- `MismatchSenderId` (proyecto FCM mal configurado)
- `InvalidArgument` por payload mal formado
- Rate-limit / `Unavailable`
- Permisos revocados en el dispositivo

Sin ese detalle no hay forma de decidir si purgar tokens, cambiar config, o reintentar.

## Alcance

### Dentro

- Modificar el handler de `POST /admin/notifications/send` para acumular y devolver `failures[]`.
- Definir un set acotado de códigos de error (mapeo desde la respuesta del proveedor push, FCM/APNs).
- Limitar el tamaño de `failures[]` para no inflar la respuesta cuando el broadcast es masivo.
- Tests de unidad e integración cubriendo cada código.

### Fuera

- Reintentos automáticos (los hace el cliente o un job aparte).
- Persistir las fallas en una tabla de auditoría (separar a otro spec si hace falta).
- Cambiar el shape de `target_users` / `sent` / `failed` (se mantienen).

## Contrato actual vs propuesto

### Request (sin cambios)

```json
POST /admin/notifications/send
{
  "target": "specific",
  "user_ids": [123],
  "mode": "preset",
  "preset": { "alert_type": "soil_dry", "plant_nickname": "Cecilia" }
}
```

### Response actual

```json
{
  "success": true,
  "data": {
    "target_users": 1,
    "sent": 0,
    "failed": 43,
    "failures": []
  }
}
```

### Response propuesta

```json
{
  "success": true,
  "data": {
    "target_users": 1,
    "sent": 0,
    "failed": 43,
    "failures": [
      { "user_id": 123, "device_id": 5012, "token": "fcm:abcd…1234", "error_code": "device_not_registered", "error": "Requested entity was not found." },
      { "user_id": 123, "device_id": 5013, "token": "fcm:efgh…5678", "error_code": "invalid_argument", "error": "Invalid registration token." }
    ],
    "failures_truncated": false
  }
}
```

Notas de shape:

- `failures[]` es **opcional** desde el lado del cliente (ya tipado así en `bloomit-admin`), pero el backend siempre debe devolverlo (puede ser `[]`) para consistencia.
- `device_id` y `token` son nuevos pero útiles para debugging. `token` debe venir **truncado** (primeros 4 + últimos 4 caracteres) — no devolver el token completo en una respuesta admin.
- `error` es la cadena cruda del proveedor (sirve para grep en logs).
- `error_code` es nuestro enum normalizado (ver tabla abajo).
- Si el broadcast es grande y `failures.length > N` (ver "Límites"), truncar y poner `failures_truncated: true`.

## Tabla de `error_code`

Mapear desde FCM (`messaging/...`) y APNs:

| `error_code`             | Cuándo                                                              | Acción sugerida                       |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------- |
| `device_not_registered`  | FCM `messaging/registration-token-not-registered`, APNs `Unregistered` | Borrar token de DB                    |
| `invalid_argument`       | FCM `messaging/invalid-argument`, payload mal formado               | Bug nuestro, alertar                  |
| `mismatched_credential`  | FCM `messaging/mismatched-credential`, sender ID equivocado         | Config error, alertar                 |
| `unavailable`            | FCM `messaging/server-unavailable`, 5xx, timeouts                   | Reintentar con backoff                |
| `quota_exceeded`         | FCM `messaging/quota-exceeded`                                      | Reintentar más tarde                  |
| `permission_denied`      | Service-account sin permisos                                        | Config error, alertar                 |
| `unknown`                | Cualquier otro                                                      | Loguear `error` crudo                 |

Si por motivos de privacidad no se quiere exponer `error` crudo al admin panel, alcanza con `error_code` + un short message en español. Pero tener al menos `error_code` es no-negociable.

## Límites

- `failures[]` **máximo 500 items** por respuesta. Para broadcasts a "todos", truncar y setear `failures_truncated: true`. La UI ya muestra el contador real `failed`, así que el truncado no engaña.
- Si en el futuro se necesita el detalle completo para broadcasts masivos, agregar un endpoint `GET /admin/notifications/:job_id/failures` (fuera de alcance acá).

## Implementación

1. En el sender de push (donde hoy se incrementa `failed`), capturar `{ user_id, device_id, token, error_code, error_raw }` por cada falla.
2. Normalizar `error_code` con un mapper sincrónico a partir del error del SDK del proveedor.
3. Acumular en una lista, hasta el límite. Si se pasa, descartar el resto y marcar `failures_truncated`.
4. Truncar el `token` antes de serializar (`token.slice(0,4) + '…' + token.slice(-4)`).
5. Devolver en `data.failures` y `data.failures_truncated`.

## Tests

Unitarios (mockeando el SDK de push):

- 1 user, 1 device, FCM tira `registration-token-not-registered` → `failures = [{ error_code: 'device_not_registered', ... }]`, `failed = 1`.
- 1 user, 3 devices, mix de errores → cada uno con su `error_code` correcto.
- 1 user, 600 devices todos fallando → `failures.length === 500`, `failures_truncated === true`, `failed === 600`.
- Token largo → en la respuesta queda truncado a `xxxx…yyyy`.
- Provider devuelve un error desconocido → `error_code: 'unknown'`, `error` crudo presente.

Integración:

- `POST /admin/notifications/send` con un user con tokens basura → 200, `sent: 0`, `failed: N`, `failures.length === N`, todos `device_not_registered`.

## Frontend (ya hecho)

- `bloomit-admin` ya marca `failures` como opcional en `SendNotificationResult` (`src/services/adminApi.ts`).
- `NotificationsPage` muestra el panel de detalles cuando `failures.length > 0`, y un aviso ("`X fallidas sin detalle`") cuando `failed > 0` y `failures` viene vacío. Una vez que el backend popule `failures[]`, el aviso desaparece automáticamente y se ve el detalle.
- `FailuresPanel` ya soporta `{ user_id, error }`. Cuando el backend agregue `device_id` / `error_code` / `token`, conviene extender el render del panel en una segunda iteración (por ahora se concatena `error` igual y es legible).

## Riesgo / rollback

- Cambio aditivo. Clientes viejos siguen funcionando — sólo ignoran los nuevos campos.
- Si el mapper de errores tira en runtime, fallback a `error_code: 'unknown'` y seguir.
