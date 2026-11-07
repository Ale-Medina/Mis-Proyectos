// Seed inicial: personas, configuración, responsabilidades por día de la
// semana y todas las plantillas de tareas descriptas en el encargo original.
// Todo esto es editable después desde la sección "Configuración" de la app,
// sin tocar código.

import { PrismaClient, type RotationMode as PrismaRotationMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { today } from "../src/lib/dates";

const prisma = new PrismaClient();

async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

type TemplateSeed = {
  name: string;
  description?: string;
  categoryKey: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "ONCE";
  daysOfWeek?: string | null;
  occurrencesPerMonth?: number;
  scheduleType?: "FIXED_TIME" | "ORIENTATIVE_TIME" | "TARGET_DATE" | "FLEXIBLE_WINDOW";
  orientativeTime?: string | null;
  durationMinutes: number;
  rotationMode: PrismaRotationMode;
  anchor?: "Helu" | "Ale" | null;
  isShared?: boolean;
  isCore?: boolean;
  active?: boolean;
  subtasks?: string[];
  sortOrder?: number;
};

async function main() {
  console.log("Creando personas...");
  const defaultPin = await hashPin("1234");

  const helu = await prisma.person.upsert({
    where: { name: "Helu" },
    update: {},
    create: { name: "Helu", pinHash: defaultPin, colorHex: "#C9798C" },
  });
  const ale = await prisma.person.upsert({
    where: { name: "Ale" },
    update: {},
    create: { name: "Ale", pinHash: defaultPin, colorHex: "#5B8A82" },
  });
  const byName = { Helu: helu, Ale: ale };

  console.log("Configuración general...");
  // Arranca hoy: así no se generan tareas diarias "atrasadas" de días en que
  // el sistema todavía no existía. La paridad semanal (Semana A/B) funciona
  // igual sin importar qué día de la semana sea esta fecha.
  const systemStartDate = today();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      timezone: "America/Argentina/Cordoba",
      systemStartDate,
      defaultWakeTime: "07:00",
      trialPeriodWeeks: 3,
    },
  });

  console.log("Responsabilidades por día de la semana (trabajo y almuerzo)...");
  // 0=domingo ... 6=sábado. Helu: lun/mié/vie. Ale: mar/jue/sáb. Domingo libre.
  const weekdayMap: Record<number, "Helu" | "Ale" | null> = {
    0: null,
    1: "Helu",
    2: "Ale",
    3: "Helu",
    4: "Ale",
    5: "Helu",
    6: "Ale",
  };
  for (const kind of ["WORK_BLOCK", "LUNCH"] as const) {
    for (let day = 0; day <= 6; day++) {
      const personName = weekdayMap[day];
      await prisma.weekdayResponsibility.upsert({
        where: { kind_dayOfWeek: { kind, dayOfWeek: day } },
        update: {},
        create: {
          kind,
          dayOfWeek: day,
          personId: personName ? byName[personName].id : null,
        },
      });
    }
  }

  console.log("Categorías...");
  const categoryDefs = [
    { key: "trabajo", name: "Trabajo", balanceGroup: "WORK", colorKey: "amber", sortOrder: 1 },
    { key: "admin-hogar", name: "Administración del hogar", balanceGroup: "HOUSEHOLD", colorKey: "stone", sortOrder: 2 },
    { key: "limpieza-diaria", name: "Limpieza diaria", balanceGroup: "HOUSEHOLD", colorKey: "sky", sortOrder: 3 },
    { key: "ropa-basura", name: "Ropa y basura", balanceGroup: "HOUSEHOLD", colorKey: "violet", sortOrder: 4 },
    { key: "limpieza-semanal", name: "Limpieza semanal", balanceGroup: "HOUSEHOLD", colorKey: "teal", sortOrder: 5 },
    { key: "limpieza-mensual", name: "Limpieza quincenal y mensual", balanceGroup: "HOUSEHOLD", colorKey: "indigo", sortOrder: 6 },
    { key: "cuidado-nena", name: "Cuidado de nuestra hija", balanceGroup: "CHILDCARE", colorKey: "rose", sortOrder: 7 },
    { key: "personal", name: "Entrenamientos y tiempo personal", balanceGroup: "PERSONAL", colorKey: "emerald", sortOrder: 8 },
  ] as const;

  const categories: Record<string, { id: string }> = {};
  for (const c of categoryDefs) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: { balanceGroup: c.balanceGroup, colorKey: c.colorKey, sortOrder: c.sortOrder },
      create: {
        name: c.name,
        balanceGroup: c.balanceGroup,
        colorKey: c.colorKey,
        sortOrder: c.sortOrder,
      },
    });
    categories[c.key] = cat;
  }

  console.log("Plantillas de tareas...");

  const templates: TemplateSeed[] = [
    // --- Trabajo ---
    {
      name: "Planificación laboral semanal",
      description:
        "Ritual conjunto de ~15 minutos los domingos: urgente, importante y desarrollo, con responsables y fechas de entrega.",
      categoryKey: "trabajo",
      frequency: "WEEKLY",
      daysOfWeek: "0",
      scheduleType: "ORIENTATIVE_TIME",
      orientativeTime: "18:00",
      durationMinutes: 15,
      rotationMode: "NONE",
      isShared: true,
      subtasks: [
        "Revisar trabajos urgentes",
        "Revisar trabajos importantes",
        "Revisar desarrollo y proyectos",
        "Asignar responsables y fechas de entrega",
      ],
      sortOrder: 1,
    },

    // --- Administración del hogar ---
    {
      name: "Compra grande mensual",
      description: "Planificar, revisar cantidades, comparar precios y coordinar el retiro.",
      categoryKey: "admin-hogar",
      frequency: "MONTHLY",
      occurrencesPerMonth: 1,
      durationMinutes: 60,
      rotationMode: "FIXED",
      anchor: "Helu",
      subtasks: ["Planificar lista", "Revisar cantidades", "Comparar precios", "Coordinar retiro"],
      sortOrder: 1,
    },
    {
      name: "Finanzas y pagos del hogar",
      description: "Revisar y pagar boletas, organizar finanzas domésticas.",
      categoryKey: "admin-hogar",
      frequency: "MONTHLY",
      occurrencesPerMonth: 1,
      durationMinutes: 60,
      rotationMode: "FIXED",
      anchor: "Helu",
      subtasks: ["Revisar y pagar boletas", "Organizar finanzas domésticas"],
      sortOrder: 2,
    },

    // --- Limpieza diaria ---
    {
      name: "Pisos interiores",
      description: "Barrer y pasar trapo. No incluye oficina, pasillo de planta alta ni escalera.",
      categoryKey: "limpieza-diaria",
      frequency: "DAILY",
      durationMinutes: 22,
      rotationMode: "DAILY_ALTERNATE",
      anchor: "Helu",
      subtasks: ["Barrer", "Pasar trapo"],
      sortOrder: 1,
    },
    {
      name: "Patio y accidentes de Dobby",
      description:
        "Incluye patio y limpieza de los accidentes de Dobby (dentro y fuera). Si hay un accidente nuevo, lo limpia quien lo detecte, sin esperar el turno.",
      categoryKey: "limpieza-diaria",
      frequency: "DAILY",
      durationMinutes: 25,
      rotationMode: "DAILY_ALTERNATE",
      anchor: "Ale",
      subtasks: ["Barrer/ordenar patio", "Levantar materia fecal", "Limpiar pis", "Pasar trapo", "Desinfectar si corresponde"],
      sortOrder: 2,
    },
    {
      name: "Cama matrimonial",
      description: "Hacer la cama, alternando responsabilidades diariamente.",
      categoryKey: "limpieza-diaria",
      frequency: "DAILY",
      durationMinutes: 5,
      rotationMode: "DAILY_ALTERNATE",
      anchor: "Helu",
      sortOrder: 3,
    },

    // --- Ropa y basura ---
    {
      name: "Ropa",
      description:
        "Responsabilidad completa de la ropa de la semana. Al terminar la semana el canasto debería quedar vacío o con poca ropa.",
      categoryKey: "ropa-basura",
      frequency: "WEEKLY",
      durationMinutes: 75,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Helu",
      subtasks: [
        "Revisar y separar",
        "Lavar",
        "Tender",
        "Retirar",
        "Doblar",
        "Guardar",
        "Cambiar sábanas (si corresponde esta semana) y lavarlas",
      ],
      sortOrder: 1,
    },
    {
      name: "Basura",
      description: "Rotación semanal opuesta a la ropa.",
      categoryKey: "ropa-basura",
      frequency: "WEEKLY",
      durationMinutes: 20,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Ale",
      subtasks: ["Revisar cestos", "Retirar bolsas", "Sacar basura", "Colocar bolsas nuevas", "Limpiar tachos si hace falta"],
      sortOrder: 2,
    },

    // --- Limpieza semanal ---
    {
      name: "Baño completo",
      categoryKey: "limpieza-semanal",
      frequency: "WEEKLY",
      durationMinutes: 30,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Helu",
      subtasks: [
        "Inodoro (interior, exterior y detrás)",
        "Bañera completa",
        "Piso y paredes de bañera",
        "Griferías",
        "Bacha",
        "Espejo",
        "Mueble: retirar objetos, limpiar y reacomodar",
        "Azulejos y manchas",
        "Piso y rincones",
        "Desagües y pelos",
        "Vaciar cesto",
        "Reponer papel y jabón",
        "Ordenar toallas",
      ],
      sortOrder: 1,
    },
    {
      name: "Living y comedor",
      description: "No incluye pisos (se limpian a diario como tarea independiente).",
      categoryKey: "limpieza-semanal",
      frequency: "WEEKLY",
      durationMinutes: 40,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Ale",
      subtasks: [
        "Guardar objetos",
        "Acomodar sillón, almohadones y mantas",
        "Cambiar funda si es necesario",
        "Retirar vasos y platos",
        "Limpiar mesas, muebles y superficies",
        "Limpiar mesa y silla de la nena",
        "Sacar polvo",
        "Limpiar superficies altas",
        "Ventanas, vidrios y espejos",
        "Puertas, picaportes, interruptores y zócalos",
        "Telarañas de techos y esquinas",
      ],
      sortOrder: 2,
    },
    {
      name: "Habitación de la nena",
      categoryKey: "limpieza-semanal",
      frequency: "WEEKLY",
      daysOfWeek: "6",
      durationMinutes: 60,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Ale",
      subtasks: [
        "Retirar objetos de muebles",
        "Limpiar superficies y polvo",
        "Reorganizar juguetes por categorías (libros, bloques, muñecas, autitos, cocinita, colitas y trabitas)",
        "Retirar objetos que no corresponden a la habitación",
        "Revisar juguetes rotos o piezas faltantes",
        "Mantener los juguetes accesibles",
        "Limpiar debajo de muebles cuando corresponda",
      ],
      sortOrder: 3,
    },
    {
      name: "Oficina",
      categoryKey: "limpieza-semanal",
      frequency: "WEEKLY",
      durationMinutes: 30,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Helu",
      subtasks: ["Barrer y pasar trapo", "Ordenar", "Limpiar biblioteca y estantes", "Sacar polvo de libros y superficies", "Acomodar objetos", "Limpiar piso y rincones"],
      sortOrder: 4,
    },
    {
      name: "Dormitorio matrimonial",
      description: "No incluye hacer la cama (tiene su propia rotación diaria).",
      categoryKey: "limpieza-semanal",
      frequency: "WEEKLY",
      durationMinutes: 10,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Ale",
      subtasks: ["Ventilar", "Guardar ropa y objetos fuera de lugar", "Despejar respaldar", "Mantener ordenado"],
      sortOrder: 5,
    },

    // --- Limpieza quincenal y mensual ---
    {
      name: "Cocina profunda",
      description: "Dos veces al mes (una Helu, una Ale). El orden se alterna cada mes.",
      categoryKey: "limpieza-mensual",
      frequency: "MONTHLY",
      occurrencesPerMonth: 2,
      durationMinutes: 40,
      rotationMode: "MONTHLY_SPLIT_ALTERNATE",
      anchor: "Helu",
      subtasks: [
        "Frentes de muebles y alacenas",
        "Exterior de heladera",
        "Microondas interior y exterior",
        "Salpicaduras de paredes y azulejos",
        "Cocina y superficies",
        "Rincones y grasitud",
        "Horno (si corresponde)",
      ],
      sortOrder: 1,
    },
    {
      name: "Heladera",
      categoryKey: "limpieza-mensual",
      frequency: "MONTHLY",
      occurrencesPerMonth: 2,
      durationMinutes: 20,
      rotationMode: "FIXED",
      anchor: "Ale",
      subtasks: ["Revisar alimentos", "Revisar vencimientos", "Limpiar interior si corresponde", "Retirar productos en mal estado"],
      sortOrder: 2,
    },
    {
      name: "Pasillo, mueble y espejo (planta alta)",
      categoryKey: "limpieza-mensual",
      frequency: "MONTHLY",
      occurrencesPerMonth: 2,
      durationMinutes: 10,
      rotationMode: "FIXED",
      anchor: "Ale",
      subtasks: ["Ordenar pasillo", "Retirar perfumes y objetos", "Limpiar mueble", "Limpiar espejo", "Quitar polvo y reacomodar"],
      sortOrder: 3,
    },
    {
      name: "Escalera y debajo",
      categoryKey: "limpieza-mensual",
      frequency: "MONTHLY",
      occurrencesPerMonth: 1,
      durationMinutes: 30,
      rotationMode: "FIXED",
      anchor: "Ale",
      subtasks: ["Retirar objetos", "Barrer escalones y rincones", "Limpiar huellas y manchas", "Pasar trapo", "Limpiar y ordenar debajo", "Volver a colocar lo que corresponde"],
      sortOrder: 4,
    },
    {
      name: "Lavarropas y filtro",
      description: "Responsable inicial Ale. Se puede pasar a alternancia mensual desde Configuración.",
      categoryKey: "limpieza-mensual",
      frequency: "MONTHLY",
      occurrencesPerMonth: 1,
      durationMinutes: 25,
      rotationMode: "FIXED",
      anchor: "Ale",
      sortOrder: 5,
    },

    // --- Cuidado de la nena ---
    {
      name: "Gimnasia artística",
      description: "Salida ~17:15, clase 18:00-19:00, regreso ~19:45. Compromiso reservado para ambos.",
      categoryKey: "cuidado-nena",
      frequency: "WEEKLY",
      daysOfWeek: "2,4",
      scheduleType: "FIXED_TIME",
      orientativeTime: "18:00",
      durationMinutes: 165,
      rotationMode: "NONE",
      isShared: true,
      subtasks: ["Salida ~17:15", "Clase 18:00–19:00", "Regreso ~19:45"],
      sortOrder: 1,
    },
    {
      name: "Baño de la nena",
      description:
        "Aproximadamente día por medio, sin horario fijo. Si no se bañó porque no era necesario, no se considera atrasada.",
      categoryKey: "cuidado-nena",
      frequency: "WEEKLY",
      scheduleType: "FLEXIBLE_WINDOW",
      durationMinutes: 30,
      rotationMode: "WEEKLY_ALTERNATE",
      anchor: "Helu",
      isCore: true,
      sortOrder: 2,
    },

    // --- Entrenamientos y tiempo personal ---
    {
      name: "CrossFit (Ale)",
      description: "Horarios en prueba; el compromiso real puede extenderse hasta 2 horas.",
      categoryKey: "personal",
      frequency: "WEEKLY",
      daysOfWeek: "1,3,5",
      scheduleType: "FIXED_TIME",
      orientativeTime: "19:00",
      durationMinutes: 120,
      rotationMode: "FIXED",
      anchor: "Ale",
      sortOrder: 1,
    },
    {
      name: "Entrenamiento (Helu)",
      description:
        "Todavía sin día ni horario fijo: se activa cuando la organización y el descanso nocturno lo permitan.",
      categoryKey: "personal",
      frequency: "WEEKLY",
      durationMinutes: 60,
      rotationMode: "FIXED",
      anchor: "Helu",
      active: false,
      sortOrder: 2,
    },
  ];

  for (const t of templates) {
    const category = categories[t.categoryKey];
    const anchorPersonId = t.anchor ? byName[t.anchor].id : null;
    const existing = await prisma.taskTemplate.findFirst({
      where: { name: t.name, categoryId: category.id },
    });
    const data = {
      name: t.name,
      description: t.description ?? "",
      categoryId: category.id,
      frequency: t.frequency,
      daysOfWeek: t.daysOfWeek ?? null,
      occurrencesPerMonth: t.occurrencesPerMonth ?? 1,
      scheduleType: t.scheduleType ?? "ORIENTATIVE_TIME",
      orientativeTime: t.orientativeTime ?? null,
      durationMinutes: t.durationMinutes,
      rotationMode: t.rotationMode,
      rotationAnchorDate: t.rotationMode === "NONE" || t.rotationMode === "FIXED" && !t.anchor ? null : systemStartDate,
      rotationAnchorPersonId: anchorPersonId,
      isShared: t.isShared ?? false,
      isCore: t.isCore ?? false,
      active: t.active ?? true,
      subtasks: t.subtasks ?? [],
      sortOrder: t.sortOrder ?? 0,
    };
    if (existing) {
      await prisma.taskTemplate.update({ where: { id: existing.id }, data });
    } else {
      await prisma.taskTemplate.create({ data });
    }
  }

  console.log("Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
