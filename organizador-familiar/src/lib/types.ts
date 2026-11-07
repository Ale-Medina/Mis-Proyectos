// Tipos compartidos por el cliente (no importar nada de prisma/servidor acá).

export type BalanceGroup = "WORK" | "HOUSEHOLD" | "CHILDCARE" | "NIGHT" | "PERSONAL";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "RESCHEDULED";

export type EffectiveStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "LATE" | "RESCHEDULED";

export type SubtaskState = { name: string; done: boolean };

export type Task = {
  id: string;
  templateId: string;
  templateName: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryColorKey: string;
  balanceGroup: BalanceGroup;
  date: string;
  windowStart: string | null;
  windowEnd: string | null;
  scheduleType: "FIXED_TIME" | "ORIENTATIVE_TIME" | "TARGET_DATE" | "FLEXIBLE_WINDOW";
  orientativeTime: string | null;
  durationMinutes: number;
  isShared: boolean;
  isCore: boolean;
  assignedPersonId: string | null;
  assignedPersonName: string | null;
  assignedPersonColor: string | null;
  status: TaskStatus;
  effectiveStatus: EffectiveStatus;
  daysLate: number;
  completedAt: string | null;
  completedByPersonId: string | null;
  completedByPersonName: string | null;
  actualMinutes: number | null;
  notes: string | null;
  subtaskState: SubtaskState[];
  rescheduledDate: string | null;
};

export type Person = { id: string; name: string; colorHex: string };

export type Category = {
  id: string;
  name: string;
  balanceGroup: BalanceGroup;
  colorKey: string;
  sortOrder: number;
};

export type RotationMode =
  | "NONE"
  | "FIXED"
  | "DAILY_ALTERNATE"
  | "WEEKLY_ALTERNATE"
  | "MONTHLY_ALTERNATE"
  | "MONTHLY_SPLIT_ALTERNATE";

export type TemplateAdmin = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "ONCE";
  daysOfWeek: string | null;
  occurrencesPerMonth: number;
  scheduleType: "FIXED_TIME" | "ORIENTATIVE_TIME" | "TARGET_DATE" | "FLEXIBLE_WINDOW";
  orientativeTime: string | null;
  durationMinutes: number;
  rotationMode: RotationMode;
  rotationAnchorDate: string | null;
  rotationAnchorPersonId: string | null;
  rotationAnchorPersonName: string | null;
  isShared: boolean;
  isCore: boolean;
  active: boolean;
  subtasks: string[];
  sortOrder: number;
};

export type WeekdayResponsibility = {
  id: string;
  kind: "WORK_BLOCK" | "LUNCH";
  dayOfWeek: number;
  personId: string | null;
  personName: string | null;
};

export type NightLogEntry = {
  date: string;
  restHelu: "GOOD" | "REGULAR" | "BAD" | null;
  restAle: "GOOD" | "REGULAR" | "BAD" | null;
  wakeupsCount: number | null;
  attendedById: string | null;
  attendedByName: string | null;
  longFeeding: boolean | null;
  morningRecoveryNotes: string | null;
  notes: string | null;
};

export type WeeklyPlanItem = {
  id: string;
  title: string;
  type: "URGENT" | "IMPORTANT" | "DEVELOPMENT";
  responsibleId: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  notes: string | null;
};

export type PersonBalance = {
  estimatedMinutes: number;
  actualMinutes: number;
  tasksDone: number;
  tasksTotal: number;
};

export type BalanceResponse = {
  from: string;
  to: string;
  persons: Person[];
  byGroup: Record<BalanceGroup, Record<string, PersonBalance>>;
  night: {
    nights: number;
    attendedCount: Record<string, number>;
    restQuality: Record<string, { GOOD: number; REGULAR: number; BAD: number }>;
  };
};
