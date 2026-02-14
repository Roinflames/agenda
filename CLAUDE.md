# BoxMagic SaaS - Reglas del Proyecto

## Idioma
- Toda comunicación y documentación en **español**.

## Seguimiento
- Mantener actualizado el archivo `docs/SEGUIMIENTO.md` con el progreso del proyecto.
- Al iniciar cada sesión, leer el archivo de seguimiento para retomar contexto.

## Operacion de sesion
- Regla general: al finalizar cambios, levantar servicios para revision manual del usuario.
- Flujo por defecto local: `docker compose up -d --build` y validar `http://localhost:3101/health` + `http://localhost:5180`.

## Requerimientos
- Consultar `docs/SRS_IEEE830.md` para el contexto de requerimientos del sistema (formato IEEE 830).

## Convenciones NestJS (API)
- Rutas en español: `/reservas`, `/horarios`, `/bloqueos`, `/centros`, `/usuarios`, etc.
- Cada módulo sigue la estructura: `module.ts`, `controllers/`, `services/`, `dto/`
- `AccessModule` es `@Global()` — no importar en otros módulos, solo inyectar `AccessService`
- Todos los endpoints requieren JWT auth via `JwtAuthGuard`
- Controllers usan `@CurrentUser()` para obtener el usuario autenticado
- Services reciben `requesterId` como primer parámetro para control de acceso
- Swagger: decoradores `@ApiTags()` y `@ApiBearerAuth()` en cada controller
- DTOs usan `class-validator` para validación

## Estilo Visual Frontend (aprobado por cliente)
- **NO cambiar** el estilo visual existente. El cliente ya lo aprobó.
- Paleta: `slate` (claro) con fondo gradiente glassmorphism.
- Cards: clase `app-card` (rounded-2xl, border-slate-200, bg-white/85, backdrop-blur).
- Inputs: clase `app-input`. Botones: `app-btn-primary`, `app-btn-sm`.
- Nav: header sticky con "CentroFit Admin" + badge versión + links horizontales.
- Reservas: layout 3 columnas (1 col formulario izquierda + 2 col calendario derecha).
- Mantener el formulario "Crear reserva" visible en la vista de Reservas.
- Nuevas páginas deben seguir el mismo patrón visual (app-card, text-slate-*, etc.).
