# Especificacion de Requisitos de Software (SRS)
## Formato IEEE 830

## 1. Introduccion
### 1.1 Proposito
Definir los requisitos funcionales y no funcionales del sistema `CentroFit SaaS (MVP)`, orientado a la gestion de centros deportivos con foco en reservas, membresias, pagos y reportes operativos.

### 1.2 Alcance
El sistema permite:
- Registro y autenticacion de usuarios.
- Gestion de centros deportivos y control de acceso por rol.
- Gestion de usuarios por centro.
- Gestion de reservas de clases y espacios.
- Gestion de planes y asignacion de membresias.
- Registro y consulta de pagos (manual y Stripe).
- Reportes de ingresos y reservas por periodo.

### 1.3 Definiciones, acronimos y abreviaturas
- `SRS`: Software Requirements Specification.
- `MVP`: Minimum Viable Product.
- `RBAC`: control de acceso basado en roles.
- `JWT`: JSON Web Token.

### 1.4 Referencias
- IEEE Std 830-1998.
- Repositorio del proyecto: `boxmagic-saas`.
- Backend: `apps/api`.
- Frontend: `apps/web`.

### 1.5 Vision general
Este documento describe descripcion general, interfaces, requisitos, reglas de negocio y criterios de aceptacion del MVP.

## 2. Descripcion general
### 2.1 Perspectiva del producto
Aplicacion SaaS web tipo monorepo:
- `apps/api`: NestJS + Prisma + PostgreSQL.
- `apps/web`: React + Vite + Tailwind.

### 2.2 Funciones del producto
- Gestion de cuentas, login y sesiones.
- Gestion de centros y usuarios por centro.
- Gestion de reservas y membresias.
- Gestion de pagos y estados de transaccion.
- Reportes operativos por fechas.

### 2.3 Caracteristicas de usuarios
- `SUPERADMIN`: gestion global.
- `OWNER`: propietario de centro.
- `ADMIN`: administrador de centro.
- `STAFF`: operador.
- `MEMBER`: miembro final.

### 2.4 Restricciones
- PostgreSQL obligatorio via `DATABASE_URL`.
- Integracion de Stripe depende de claves externas.
- MVP sin app movil nativa (solo web responsiva).

### 2.5 Supuestos y dependencias
- Disponibilidad de infraestructura cloud para deploy (Render).
- Secretos administrados por variables de entorno.
- Conectividad de red para operacion diaria.

## 3. Requisitos especificos
### 3.1 Requisitos de interfaces externas
#### 3.1.1 Interfaz de usuario
- Login y navegacion autenticada.
- Modulos de Dashboard, Usuarios, Reservas, Membresias y Reportes.
- Cierre de sesion y proteccion de rutas.

#### 3.1.2 Interfaz de software (API REST)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET/POST/PUT/DELETE /centros`
- `GET /centros/:id/dashboard`
- `GET/POST/PUT/DELETE /usuarios`
- `GET /usuarios/:id/reservas`
- `GET/POST/PUT/DELETE /reservas`
- `GET/POST/PUT/DELETE /membresias/planes`
- `POST /membresias/asignar`
- `GET /membresias/pagos`
- `POST /pagos/crear`
- `GET /pagos/:id`
- `POST /pagos/webhook/stripe`
- `GET /reportes/ingresos`
- `GET /reportes/reservas`
- `GET /health`

#### 3.1.3 Interfaz de comunicaciones
- HTTP/HTTPS para UI y API.
- TLS para conexion a PostgreSQL/Neon.
- Webhook HTTPS para Stripe.

### 3.2 Requisitos funcionales
- `RF-01`: El sistema debe permitir registro y login de usuarios.
- `RF-02`: El sistema debe permitir refresh de sesion con refresh token.
- `RF-03`: El sistema debe permitir crear/listar/editar/eliminar centros.
- `RF-04`: El sistema debe restringir acceso por relacion usuario-centro y rol.
- `RF-05`: El sistema debe permitir crear/listar/editar/remover usuarios de centro.
- `RF-06`: El sistema debe permitir crear/listar/editar/eliminar reservas.
- `RF-07`: El sistema debe soportar reservas tipo `CLASS` y `SPACE`.
- `RF-08`: El sistema debe permitir crear/listar/editar/eliminar planes de membresia.
- `RF-09`: El sistema debe permitir asignar membresia a un usuario.
- `RF-10`: El sistema debe exponer historial de pagos por centro y/o usuario.
- `RF-11`: El sistema debe permitir iniciar pagos con proveedor manual o Stripe.
- `RF-12`: El sistema debe procesar webhook de Stripe con persistencia de eventos.
- `RF-13`: El sistema debe exponer reporte de ingresos por rango de fechas.
- `RF-14`: El sistema debe exponer reporte de reservas por rango de fechas.
- `RF-15`: El sistema debe exponer endpoint de salud para monitoreo de despliegue.

### 3.3 Requisitos no funcionales
- `RNF-01` Seguridad: endpoints de negocio protegidos con JWT.
- `RNF-02` Seguridad: manejo de secretos por variables de entorno.
- `RNF-03` Rendimiento: consultas operativas comunes bajo 2 segundos en condicion normal.
- `RNF-04` Disponibilidad: orientado a operacion diaria en infraestructura cloud.
- `RNF-05` Mantenibilidad: arquitectura modular por dominio.
- `RNF-06` Portabilidad: ejecucion local y por contenedores Docker.

### 3.4 Reglas de negocio
- `RB-01`: Un usuario solo puede operar recursos de centros donde tenga acceso.
- `RB-02`: Toda membresia debe tener plan, centro y usuario validos.
- `RB-03`: Toda reserva debe pertenecer a un centro y usuario validos.
- `RB-04`: Todo pago debe tener estado valido (`PENDING`, `PAID`, `FAILED`, `REFUNDED`).
- `RB-05`: Eventos de webhook deben ser idempotentes por `eventId`.

## 4. Criterios de aceptacion del MVP
- `CA-01`: El usuario puede registrarse, iniciar sesion y consultar `me`.
- `CA-02`: Usuario autorizado puede gestionar centros.
- `CA-03`: Usuario autorizado puede gestionar usuarios de centro.
- `CA-04`: Operador puede gestionar reservas de punta a punta.
- `CA-05`: Operador puede gestionar planes y asignaciones de membresia.
- `CA-06`: Operador puede revisar historial de pagos por centro/usuario.
- `CA-07`: Se puede crear pago y consultar su estado.
- `CA-08`: Webhook de Stripe se procesa sin duplicados por `eventId`.
- `CA-09`: Reportes entregan datos por rango de fechas.
- `CA-10`: Endpoint `/health` responde correctamente en ambiente desplegado.

## 5. Anexos
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `render.yaml`
