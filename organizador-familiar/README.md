# Organizador Familiar — Helu & Ale

Aplicación web real (no maqueta) para organizar tareas del hogar, cuidado de
la nena, trabajo y tiempo personal entre dos adultos. Hecha con Next.js 16
(App Router + Route Handlers como backend), Prisma y base de datos SQLite por
defecto. Pensada para usarse todos los días desde el celular.

Zona horaria: `America/Argentina/Cordoba` (UTC-3). Formato de fecha `DD/MM/AAAA`,
hora 24h. Idioma: español.

## 1. Qué está implementado

- **Navegación funcional completa**: Mi día, Calendario (semana/mes),
  Tareas del hogar, Trabajo, Cuidado de nuestra hija, Noches, Balance,
  Historial, Configuración. Responsive, con barra inferior en celular y
  barra lateral en pantallas grandes.
- **Autenticación real de dos perfiles** (Helu / Ale) con PIN, sesión por
  cookie firmada (JWT, `jose`) y PIN hasheado (`bcrypt`). Cada quien entra
  desde su propio dispositivo.
- **Persistencia real en base de datos** (Prisma + SQLite por defecto, o
  Postgres si se configura `DATABASE_URL`). Nada se guarda solo en memoria
  ni solo en el navegador.
- **Sincronización entre dispositivos**: todos los datos viven en el
  servidor; cada cliente los refresca automáticamente cada ~20s y al volver
  a la pestaña/app (SWR). Si Helu marca algo hecho, Ale lo ve sin recargar
  manualmente. *(Importante: esto funciona porque ambos dispositivos hablan
  con el mismo servidor desplegado — ver sección 4, "Desplegar" — no es
  magia de sincronización P2P ni depende de que configures nada más.)*
- **Calendario con fechas reales**: vista semanal (lunes a domingo) y
  mensual, día actual resaltado, navegación a semanas/meses anteriores y
  futuros, indicadores de pendiente/atrasada/completada por día.
- **Motor de rotaciones basado en fechas reales**: cada tarea rotativa tiene
  una fecha ancla (`rotationAnchorDate`) y una persona de partida; la
  paridad (quién corresponde hoy) se calcula siempre como diferencia real de
  días/semanas/meses contra esa ancla — nunca se "reinicia" al cambiar de
  mes ni depende de una etiqueta fija de "Semana A/B".
- **Tareas pendientes persistentes**: una tarea no completada no
  desaparece, no se marca sola como hecha, conserva su fecha original y se
  puede consultar desde cuándo está atrasada.
- **Generación de instancias idempotente**: las tareas recurrentes generan
  nuevas instancias sin duplicar ni borrar el historial anterior (clave
  única por plantilla + fecha).
- **~20 tareas reales precargadas** (seed) siguiendo exactamente lo pedido:
  limpieza diaria con rotación cruzada, ropa/basura semanales opuestas,
  baño/living/oficina/dormitorio/habitación quincenal-semanal, cocina
  profunda/heladera/pasillo/escalera/lavarropas quincenal-mensual,
  administración del hogar, gimnasia, baño de la nena, CrossFit, etc.
- **Configuración 100% editable sin tocar código**: en `/configuracion` se
  pueden crear tareas y categorías nuevas, cambiar responsables,
  frecuencias, duraciones, horarios, días de la semana de trabajo/almuerzo,
  y el propio PIN.
- **Balance de responsabilidades** separado en las 5 categorías pedidas
  (A. Trabajo, B. Doméstico, C. Cuidado activo, D. Disponibilidad nocturna,
  E. Personal), con minutos estimados vs. reales, por semana o por mes, sin
  mezclarlas en un único número.
- **Registro nocturno, baño de la nena, descanso compensatorio y
  planificación laboral semanal** como formularios simples (sin
  cronómetros ni registros excesivos).

### Lo que queda pendiente / se simplificó a propósito

- No hay una integración de calendario externo (Google Calendar, etc.).
- La sincronización es por *polling* cada 20s, no WebSockets/Realtime — es
  suficiente para 2 usuarios y evita depender de un servicio externo, pero
  no es instantánea al milisegundo.
- No hay notificaciones push.
- La gestión de categorías es básica (crear, no borrar/reordenar desde la UI).
- El "entrenamiento de Helu" está cargado pero inactivo (como pidió el
  encargo), listo para activarse desde Configuración cuando corresponda.
- No se desplegó la aplicación a ningún hosting real: ver sección 4 para
  hacerlo. Hasta que no esté desplegada en una URL accesible desde los dos
  celulares, la sincronización entre dispositivos no puede probarse "en la
  vida real" (sí fue probada exhaustivamente en este entorno, simulando dos
  sesiones de navegador independientes).

## 2. Arquitectura y decisiones técnicas

- **Next.js 16** (App Router, Route Handlers como API, Server Components
  para layout/auth). Se desactivó "Cache Components" (`cacheComponents` en
  `next.config.ts`) porque toda la app es dinámica por usuario/base de
  datos; cada página usa el modelo de renderizado clásico.
- **`src/proxy.ts`** reemplaza al clásico `middleware.ts` (renombrado en
  Next 16): hace un chequeo optimista de sesión y redirige a `/login`. La
  verificación real (firma del JWT + que la persona exista) se hace siempre
  en el servidor.
- **Prisma 6** + SQLite (`prisma/schema.prisma`, `prisma/seed.ts`). El
  archivo de base de datos vive en disco, en el propio servidor — por eso
  dos dispositivos que hablan con el mismo servidor ven los mismos datos.
- **Motor de tareas** (`src/lib/instances.ts`, `src/lib/rotation.ts`,
  `src/lib/dates.ts`): las plantillas (`TaskTemplate`) generan instancias
  (`TaskInstance`) de forma perezosa cuando se consulta un rango de fechas,
  siempre en zona horaria Argentina, sin importar dónde corra el servidor.
- **Autenticación** simple a propósito (2 perfiles fijos + PIN), pensada
  para una app familiar privada, no para registro público. El PIN se
  cambia desde `/configuracion`.

## 3. Correr la aplicación localmente

Requisitos: Node.js 20+.

```bash
cd organizador-familiar
npm install                 # instala dependencias (y genera el cliente Prisma)
cp .env.example .env        # copiá y ajustá las variables de entorno
# generá un secreto propio para las cookies de sesión:
#   openssl rand -base64 48
# y pegalo en SESSION_SECRET dentro de .env

npx prisma migrate deploy   # crea la base de datos SQLite (prisma/dev.db)
npm run db:seed             # carga personas, categorías y tareas iniciales

npm run dev                 # http://localhost:3000
```

Perfiles de fábrica: **Helu** y **Ale**, ambos con PIN **1234**. Cambiá el
PIN de cada uno apenas entres (Configuración → Tu cuenta).

Para producción local:

```bash
npm run build
npm run start
```

### Reiniciar los datos desde cero

```bash
npm run db:reset   # borra y recrea la base, vuelve a correr el seed
```

## 4. Desplegar para que Helu y Ale lo usen desde sus celulares

La app necesita correr en un servidor accesible por internet (no alcanza
con "npm run dev" en una compu local). Dos caminos simples:

### Opción A — Render / Railway / Fly.io (más simple, sigue usando SQLite)

1. Subí este repositorio a GitHub (o usá el que ya tenés).
2. Creá un servicio **Web Service** de Node en Render/Railway/Fly apuntando
   a la carpeta `organizador-familiar`.
3. Build command: `npm install && npm run build`
   Start command: `npm run start`
4. Agregá un **disco persistente** montado en `organizador-familiar/prisma`
   (en Render: "Persistent Disk"; en Fly: un *volume*). Sin esto, cada
   despliegue nuevo borraría la base SQLite.
5. Variables de entorno: `DATABASE_URL=file:./prisma/dev.db`,
   `SESSION_SECRET=<un secreto largo propio>`.
6. Primer despliegue: corré una vez `npx prisma migrate deploy && npm run db:seed`
   contra ese servidor (la mayoría de estos servicios permite una "shell"
   o un *release command* para esto).
7. Listo: la URL pública que te den (ej. `https://organizador-familiar.onrender.com`)
   es la que abren Helu y Ale desde sus celulares. Conviene agregarla a la
   pantalla de inicio del teléfono (PWA "Agregar a inicio") para que se
   sienta como una app.

### Opción B — Vercel + Postgres (Supabase/Neon/Railway Postgres)

Vercel no tiene disco persistente, así que SQLite no sirve ahí: hay que
usar una base Postgres real. Prisma lo soporta cambiando una línea:

1. Creá una base Postgres gratuita en [Supabase](https://supabase.com),
   [Neon](https://neon.tech) o similar. Copiá su `DATABASE_URL`
   (`postgresql://usuario:password@host:5432/basededatos`).
2. En `prisma/schema.prisma`, cambiá:
   ```prisma
   datasource db {
     provider = "postgresql"   // antes: "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Borrá `prisma/migrations` (son específicas de SQLite) y corré
   `npx prisma migrate dev --name init` una vez en local apuntando a esa
   base Postgres (con `DATABASE_URL` en `.env` apuntando a Supabase/Neon),
   para generar las migraciones correctas de Postgres.
4. Desplegá el proyecto en Vercel (importar el repo de GitHub, root
   directory = `organizador-familiar`).
5. Variables de entorno en Vercel: `DATABASE_URL` (la de Supabase/Neon) y
   `SESSION_SECRET`.
6. Corré el seed una vez contra esa base (`npm run db:seed` en tu máquina,
   con `.env` apuntando a la base de producción) para crear los perfiles y
   tareas iniciales.

No usé Supabase Auth/Realtime a propósito: con 2 usuarios fijos, un login
por PIN propio y *polling* cada 20s son más simples de mantener y no
dependen de configurar un proveedor externo adicional — pero si en el
futuro quisieran sincronización instantánea o invitar más perfiles, migrar
a Supabase (Auth + Realtime) sobre este mismo esquema de Postgres es
sencillo, porque el modelo de datos ya es relacional estándar.

## 5. Cómo "invitar" al segundo usuario

No hay un sistema de invitaciones por correo: los dos perfiles (Helu y Ale)
ya existen desde el primer `npm run db:seed`. Para habilitar a la segunda
persona:

1. Compartile la URL pública de la app (la de Render/Vercel/etc.).
2. Que entre a `/login`, elija su nombre y use el PIN de fábrica `1234`.
3. Que lo cambie enseguida desde Configuración → Tu cuenta.

Si quisieran cambiar los nombres "Helu"/"Ale" por otros, se edita
directamente en `prisma/seed.ts` (campo `name`) antes de correr el seed, o
con una consulta SQL puntual después.

## 6. Variables de entorno

| Variable         | Para qué sirve                                         | Ejemplo |
|------------------|---------------------------------------------------------|---------|
| `DATABASE_URL`   | Conexión a la base de datos (SQLite o Postgres)          | `file:./dev.db` |
| `SESSION_SECRET` | Firma las cookies de sesión. Generar con `openssl rand -base64 48` | — |

Nunca se exponen claves privadas al navegador: todo lo sensible vive en
Route Handlers del servidor.

## 7. Probado

- Fechas y zona horaria Argentina correctas en todas las vistas.
- Las rotaciones no se reinician al cambiar de semana/mes (paridad por
  fecha real contra el ancla).
- Las tareas pendientes permanecen visibles entre días sin duplicarse.
- Cambios hechos por un perfil se reflejan en el otro (probado con dos
  sesiones de navegador independientes, cada una logueada como Helu y
  Ale).
- El historial de instancias ya generadas se conserva al editar una
  plantilla o desactivarla.
- Build de producción (`npm run build`) y recorrido completo de todas las
  pantallas sin errores de consola, en vista mobile y desktop.
