# Organizador Familiar — Helu & Ale

Aplicación web real (no maqueta) para organizar tareas del hogar, cuidado de
la nena, trabajo y tiempo personal entre dos adultos. Hecha con Next.js 16
(App Router + Route Handlers como backend), Prisma y Postgres. Desplegada en
Vercel. Pensada para usarse todos los días desde el celular.

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
- **Persistencia real en base de datos** (Prisma + Postgres vía
  `DATABASE_URL`). Nada se guarda solo en memoria ni solo en el navegador.
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
- El despliegue a Vercel (sección 4) lo hizo el propio Ale desde el
  dashboard de Vercel importando el repositorio de GitHub; yo preparé el
  código para que funcione ahí (Postgres, variables de entorno, migración)
  pero no tengo acceso a esa cuenta de Vercel.

## 2. Arquitectura y decisiones técnicas

- **Next.js 16** (App Router, Route Handlers como API, Server Components
  para layout/auth). Se desactivó "Cache Components" (`cacheComponents` en
  `next.config.ts`) porque toda la app es dinámica por usuario/base de
  datos; cada página usa el modelo de renderizado clásico.
- **`src/proxy.ts`** reemplaza al clásico `middleware.ts` (renombrado en
  Next 16): hace un chequeo optimista de sesión y redirige a `/login`. La
  verificación real (firma del JWT + que la persona exista) se hace siempre
  en el servidor.
- **Prisma 6** + Postgres (`prisma/schema.prisma`, `prisma/seed.ts`). La
  base vive en un servidor Postgres (Vercel Postgres/Neon, Supabase, etc.),
  no en el disco del servidor de la app — por eso dos dispositivos que
  hablan con el mismo backend ven los mismos datos, y el despliegue puede
  ser serverless (Vercel) sin perder nada entre invocaciones.
- El generador de instancias (`ensureInstancesInRange`) usa `upsert` con
  manejo explícito de la carrera de concurrencia típica de Postgres cuando
  dos dispositivos piden datos casi al mismo tiempo (violación de la
  restricción única se trata como "ya la creó la otra request", no como
  error).
- **Motor de tareas** (`src/lib/instances.ts`, `src/lib/rotation.ts`,
  `src/lib/dates.ts`): las plantillas (`TaskTemplate`) generan instancias
  (`TaskInstance`) de forma perezosa cuando se consulta un rango de fechas,
  siempre en zona horaria Argentina, sin importar dónde corra el servidor.
- **Autenticación** simple a propósito (2 perfiles fijos + PIN), pensada
  para una app familiar privada, no para registro público. El PIN se
  cambia desde `/configuracion`.

## 3. Correr la aplicación localmente

Requisitos: Node.js 20+ y una base Postgres accesible (una gratuita de
[Neon](https://neon.tech)/[Supabase](https://supabase.com), una de Vercel
Postgres, o una instalada en tu máquina).

```bash
cd organizador-familiar
npm install                 # instala dependencias (y genera el cliente Prisma)
cp .env.example .env        # copiá y ajustá las variables de entorno
# pegá tu cadena de conexión Postgres en DATABASE_URL dentro de .env
# generá un secreto propio para las cookies de sesión:
#   openssl rand -base64 48
# y pegalo en SESSION_SECRET dentro de .env

npx prisma migrate deploy   # crea las tablas en tu base Postgres
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

## 4. Desplegar en Vercel (lo que estamos usando)

1. En [vercel.com](https://vercel.com), **Add New → Project** e importá el
   repositorio de GitHub `Ale-Medina/organizador-familiar`.
2. Pestaña **Storage** del proyecto → **Create Database** → **Postgres**
   (Neon, integrado en Vercel). Esto crea la base y conecta
   automáticamente `DATABASE_URL` (y variantes `POSTGRES_*`) al proyecto.
3. **Settings → Environment Variables** → agregá `SESSION_SECRET` con un
   valor largo y aleatorio (podés generarlo con `openssl rand -base64 48`
   en tu máquina, o pegar cualquier texto random de 40+ caracteres).
4. Volvé a desplegar (**Deployments → Redeploy**) para que tome las
   variables nuevas.
5. **Primer despliegue únicamente** — crear las tablas y cargar los datos
   iniciales. Desde tu máquina, con la `DATABASE_URL` que te dio Vercel
   (Storage → `.env.local` tab → copiarla) pegada en tu `.env` local:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
   (Los migrate/seed solo hace falta correrlos una vez contra la base de
   producción; las próximas veces que subas cambios de código, Vercel
   solo necesita rebuildear.)
6. Listo: la URL que te dio Vercel (ej.
   `https://organizador-familiar.vercel.app`) es la que abren Helu y Ale
   desde sus celulares. Conviene agregarla a la pantalla de inicio del
   teléfono ("Agregar a inicio") para que se sienta como una app.

### Alternativa sin Vercel: Render / Railway / Fly.io

También funciona en cualquier servicio que corra `npm run build` /
`npm run start` como proceso persistente (no serverless), apuntando la
misma `DATABASE_URL` de Postgres y agregando `SESSION_SECRET`. No hace
falta disco persistente porque los datos ya no viven en un archivo local.

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
| `DATABASE_URL`   | Conexión a la base Postgres                              | `postgresql://usuario:password@host:5432/basededatos` |
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
- Migración completa a **Postgres real** (instancia local de prueba, no
  SQLite): migración inicial aplicada, seed corrido, y toda la batería de
  pruebas (login, completar tareas, subtareas, reasignar, sincronización
  entre dos sesiones, edición en Configuración) repetida con éxito. Se
  encontró y corrigió una condición de carrera real del generador de
  tareas bajo Postgres cuando dos pedidos llegan al mismo tiempo (ver
  sección 2).
