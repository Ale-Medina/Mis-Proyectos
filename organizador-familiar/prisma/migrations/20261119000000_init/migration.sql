-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BalanceGroup" AS ENUM ('WORK', 'HOUSEHOLD', 'CHILDCARE', 'NIGHT', 'PERSONAL');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ONCE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FIXED_TIME', 'ORIENTATIVE_TIME', 'TARGET_DATE', 'FLEXIBLE_WINDOW');

-- CreateEnum
CREATE TYPE "RotationMode" AS ENUM ('NONE', 'FIXED', 'DAILY_ALTERNATE', 'WEEKLY_ALTERNATE', 'MONTHLY_ALTERNATE', 'MONTHLY_SPLIT_ALTERNATE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "WeekdayResponsibilityKind" AS ENUM ('WORK_BLOCK', 'LUNCH');

-- CreateEnum
CREATE TYPE "RestQuality" AS ENUM ('GOOD', 'REGULAR', 'BAD');

-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('URGENT', 'IMPORTANT', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#6B7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Cordoba',
    "systemStartDate" TIMESTAMP(3) NOT NULL,
    "defaultWakeTime" TEXT NOT NULL DEFAULT '07:00',
    "trialPeriodWeeks" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balanceGroup" "BalanceGroup" NOT NULL,
    "colorKey" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "daysOfWeek" TEXT,
    "occurrencesPerMonth" INTEGER NOT NULL DEFAULT 1,
    "scheduleType" "ScheduleType" NOT NULL DEFAULT 'ORIENTATIVE_TIME',
    "orientativeTime" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "rotationMode" "RotationMode" NOT NULL DEFAULT 'NONE',
    "rotationAnchorDate" TIMESTAMP(3),
    "rotationAnchorPersonId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "subtasks" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "assignedPersonId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedByPersonId" TEXT,
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "subtaskState" JSONB NOT NULL DEFAULT '[]',
    "rescheduledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekdayResponsibility" (
    "id" TEXT NOT NULL,
    "kind" "WeekdayResponsibilityKind" NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "personId" TEXT,

    CONSTRAINT "WeekdayResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "notes" TEXT,
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BathLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BathLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NightLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "restHelu" "RestQuality",
    "restAle" "RestQuality",
    "wakeupsCount" INTEGER,
    "attendedById" TEXT,
    "longFeeding" BOOLEAN,
    "morningRecoveryNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensatoryRestLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "careMinutesByAle" INTEGER,
    "restMinutesForHelu" INTEGER,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompensatoryRestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personId" TEXT NOT NULL,
    "description" TEXT,
    "cleanedUp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlanItem" (
    "id" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "type" "WorkItemType" NOT NULL,
    "responsibleId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "WorkItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "TaskInstance_date_idx" ON "TaskInstance"("date");

-- CreateIndex
CREATE INDEX "TaskInstance_assignedPersonId_idx" ON "TaskInstance"("assignedPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstance_templateId_date_key" ON "TaskInstance"("templateId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeekdayResponsibility_kind_dayOfWeek_key" ON "WeekdayResponsibility"("kind", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_date_key" ON "DailyLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "NightLog_date_key" ON "NightLog"("date");

-- CreateIndex
CREATE INDEX "WeeklyPlanItem_weekStartDate_idx" ON "WeeklyPlanItem"("weekStartDate");

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_rotationAnchorPersonId_fkey" FOREIGN KEY ("rotationAnchorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_assignedPersonId_fkey" FOREIGN KEY ("assignedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_completedByPersonId_fkey" FOREIGN KEY ("completedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekdayResponsibility" ADD CONSTRAINT "WeekdayResponsibility_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BathLog" ADD CONSTRAINT "BathLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightLog" ADD CONSTRAINT "NightLog_attendedById_fkey" FOREIGN KEY ("attendedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensatoryRestLog" ADD CONSTRAINT "CompensatoryRestLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanItem" ADD CONSTRAINT "WeeklyPlanItem_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

