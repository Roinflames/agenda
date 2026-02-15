# Seguimiento del Proyecto BoxMagic SaaS

## Estado General: MVP en desarrollo (~80%)

## Features Completados
- [x] Autenticación JWT (registro, login, refresh tokens)
- [x] Gestión de centros (CRUD)
- [x] Gestión de usuarios con RBAC (SUPERADMIN, OWNER, ADMIN, STAFF, MEMBER)
- [x] Sistema de reservas (CRUD con detección básica de overlap por espacio)
- [x] Membresías y planes (CRUD + asignación)
- [x] Pagos (manual + Stripe webhooks)
- [x] Reportes operacionales (ingresos, reservas por rango de fechas)
- [x] Health endpoint
- [x] Deploy en Render con Docker
- [x] Schema: MemberStatus enum (ACTIVO, CONGELADO, SUSPENDIDO, PRUEBA)
- [x] Schema: ClassSchedule y TimeBlock (migración aplicada)

## Features Completados (Sesión 2026-02-14)
- [x] Integrar módulo Schedules (`/horarios`) en app.module.ts
- [x] Integrar módulo TimeBlocks (`/bloqueos`) en app.module.ts
- [x] Endpoint update para TimeBlocks (PUT)
- [x] scheduleId en DTO de reservas
- [x] Validación de capacidad en reservas vs ClassSchedule
- [x] Validación de conflictos reservas vs TimeBlocks
- [x] Seed con datos de ejemplo para schedules y time-blocks
- [x] Build verificado sin errores

## Features Completados (Sesión 2026-02-14 - Frontend Agenda)
- [x] API client: métodos para schedules, timeBlocks, updateReservation, deleteReservation, updateUser
- [x] Rutas nuevas: /app/schedules, /app/time-blocks + links en navegación
- [x] Calendario semanal tipo Google Calendar (vista Semana/Mes toggle)
- [x] Franjas horarias 07:00-22:00, clases con colores de ocupación (verde/amarillo/rojo)
- [x] Panel lateral de detalle: click en clase → sidebar con alumnos inscritos
- [x] Staff puede cancelar reserva individual de un alumno
- [x] Botón "Cancelar clase completa" (crea TimeBlock + cancela reservas)
- [x] Gestión de Horarios (/app/schedules): CRUD completo + toggle isActive
- [x] Gestión de Bloqueos (/app/time-blocks): CRUD de feriados/bloqueos
- [x] Usuarios: barra de búsqueda por nombre/email + columna estado + selector congelar/activar
- [x] Build frontend verificado sin errores
- [x] Reportes avanzados de agenda: KPIs, cancelación %, demanda por día y top clases con filtro de fechas

## Features Pendientes (Backlog futuro)
- [x] Notificaciones (email/push)

## Historial de Sesiones

### 2026-02-14
- Creado CLAUDE.md con reglas del proyecto
- Creado este archivo de seguimiento
- Integrados módulos Schedules y TimeBlocks en app.module.ts
- Agregado endpoint PUT /bloqueos/:id (update time blocks)
- Agregado scheduleId al DTO de reservas
- Validación de capacidad (clase llena) en reservas con scheduleId
- Validación de conflictos con TimeBlocks al crear reservas
- Seed actualizado con 3 horarios de clase y 1 bloqueo (feriado)
- Build verificado sin errores
- Fix: puerto API en frontend (3101 → 3001) + creado apps/web/.env
- Planificados 9 features de agenda (ver plan detallado)

### 2026-02-14 (sesión 2 - Frontend Agenda)
- api.ts: 12 métodos nuevos (schedules CRUD, timeBlocks CRUD, updateReservation, deleteReservation, updateUser, userReservations)
- Shell.tsx: links "Horarios" y "Bloqueos" en navegación
- App.tsx: rutas /app/schedules y /app/time-blocks
- Reservations.tsx: reescrito completo con vista semanal Google Calendar + panel lateral detalle
- Schedules.tsx: nueva página CRUD horarios con toggle activar/desactivar
- TimeBlocks.tsx: nueva página CRUD bloqueos/feriados
- Users.tsx: barra búsqueda + columna estado + selector cambio de estado
- styles.css: clase app-btn-sm
- Build verificado OK

### 2026-02-14 (sesión 3 - Reportes avanzados)
- API: nuevo endpoint `GET /reportes/agenda` con métricas de agenda por rango (totales, cancelación %, demanda semanal, top clases)
- Frontend Reportes: filtros de fechas `desde/hasta` consumiendo API para ingresos, reservas y agenda
- Frontend Reportes: nuevas tarjetas KPI + secciones de demanda semanal y top clases
- Build API/Web verificado OK

### 2026-02-14 (sesión 4 - Notificaciones email/push)
- Prisma: agregado modelo `Notification` + enums `NotificationChannel` y `NotificationStatus` con migración nueva
- API: nuevo módulo `/notificaciones` con endpoints `GET /notificaciones` y `POST /notificaciones/enviar`
- API: envío simulado por canal (`EMAIL`/`PUSH`) con estado `SENT/FAILED` según datos del usuario
- Frontend: nueva ruta `/app/notifications` para enviar notificaciones y consultar historial
- Frontend: cliente API actualizado con `notifications()` y `sendNotification()`

### 2026-02-14 (sesión 5 - Foto editable de usuarios)
- Prisma: agregado campo `User.avatarUrl` con migración dedicada
- API usuarios: `create/list/update` ahora soportan `avatarUrl`
- API usuarios: `list` devuelve `status` de `CenterUser` (alineado con UI)
- Frontend Usuarios: vista de foto, campo URL en alta y edición por fila con botón guardar

### 2026-02-15 (sesión 6 - Prompt 3 Reservas: permisos y disponibilidad)
- Backend reservas:
- `MEMBER`: solo lista/modifica/elimina reservas propias (errores `403` en español si intenta cruzar datos)
- `STAFF`: solo lista/modifica/elimina reservas propias o con `staffId` asignado a su usuario
- `OWNER/ADMIN`: acceso total del centro
- Prevención de sobre-reserva reforzada por overlap en horario (`startAt < end && endAt > start`)
- Prevención de duplicados: mismo `userId + scheduleId + startAt + endAt` confirmado
- Prisma: agregado `Reservation.staffId` + índice y FK para scope de staff
- Frontend reservas:
- Oculta selector de usuario para `MEMBER` y fuerza reservas sobre su propio usuario
- Deshabilita acciones no permitidas por rol (cancelar clase completa y cancelaciones cruzadas)
- Calendario mensual con estado visual por día (`Sin horarios`, `Disponible`, `Parcial`, `Lleno/Bloqueado`)
- Modal diario de disponibilidad + agendamiento directo por franja
- Validación:
- Tests API mínimos agregados y pasando en `reservations.service.spec.ts` (4 casos)
- Build API/Web verificado OK
- Pendiente conocido:
- No existe aún una entidad explícita de asignación `staff -> alumno`; se usa `Reservation.staffId` como alcance operativo para staff en reservas.
