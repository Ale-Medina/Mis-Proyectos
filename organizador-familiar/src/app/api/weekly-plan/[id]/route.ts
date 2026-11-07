import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dayKeyToDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["URGENT", "IMPORTANT", "DEVELOPMENT"]).optional(),
  responsibleId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  await prisma.weeklyPlanItem.update({
    where: { id },
    data: {
      ...parsed.data,
      dueDate:
        parsed.data.dueDate === undefined
          ? undefined
          : parsed.data.dueDate
            ? dayKeyToDate(parsed.data.dueDate)
            : null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  await prisma.weeklyPlanItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
