import { prisma } from "./prisma";
import { ensureInstancesInRange } from "./instances";
import type { BalanceGroup } from "@prisma/client";

export type PersonBalance = {
  estimatedMinutes: number;
  actualMinutes: number;
  tasksDone: number;
  tasksTotal: number;
};

export type BalanceResult = {
  byGroup: Record<BalanceGroup, Record<string, PersonBalance>>;
  night: {
    nights: number;
    attendedCount: Record<string, number>;
    restQuality: Record<string, { GOOD: number; REGULAR: number; BAD: number }>;
  };
};

function emptyPersonBalance(): PersonBalance {
  return { estimatedMinutes: 0, actualMinutes: 0, tasksDone: 0, tasksTotal: 0 };
}

export async function computeBalance(from: Date, to: Date): Promise<BalanceResult> {
  await ensureInstancesInRange(from, to);

  const persons = await prisma.person.findMany({ select: { id: true, name: true } });
  const groups: BalanceGroup[] = ["WORK", "HOUSEHOLD", "CHILDCARE", "NIGHT", "PERSONAL"];

  const byGroup: BalanceResult["byGroup"] = {} as BalanceResult["byGroup"];
  for (const g of groups) {
    byGroup[g] = {};
    for (const p of persons) byGroup[g][p.id] = emptyPersonBalance();
  }

  const instances = await prisma.taskInstance.findMany({
    where: { date: { gte: from, lte: to } },
    include: { template: { include: { category: true } } },
  });

  for (const instance of instances) {
    const group = instance.template.category.balanceGroup;
    const duration = instance.template.durationMinutes;
    const isDone = instance.status === "DONE";
    const actual = isDone ? instance.actualMinutes ?? duration : 0;

    const targets = instance.template.isShared
      ? persons.map((p) => p.id)
      : instance.assignedPersonId
        ? [instance.assignedPersonId]
        : [];

    for (const personId of targets) {
      const bucket = byGroup[group][personId];
      if (!bucket) continue;
      bucket.estimatedMinutes += duration;
      bucket.actualMinutes += actual;
      bucket.tasksTotal += 1;
      if (isDone) bucket.tasksDone += 1;
    }
  }

  const nightLogs = await prisma.nightLog.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const attendedCount: Record<string, number> = {};
  const restQuality: Record<string, { GOOD: number; REGULAR: number; BAD: number }> = {};
  for (const p of persons) {
    attendedCount[p.id] = 0;
    restQuality[p.id] = { GOOD: 0, REGULAR: 0, BAD: 0 };
  }
  for (const log of nightLogs) {
    if (log.attendedById && attendedCount[log.attendedById] !== undefined) {
      attendedCount[log.attendedById] += 1;
    }
    const heluP = persons.find((p) => p.name === "Helu");
    const aleP = persons.find((p) => p.name === "Ale");
    if (heluP && log.restHelu) restQuality[heluP.id][log.restHelu] += 1;
    if (aleP && log.restAle) restQuality[aleP.id][log.restAle] += 1;
  }

  return {
    byGroup,
    night: { nights: nightLogs.length, attendedCount, restQuality },
  };
}
