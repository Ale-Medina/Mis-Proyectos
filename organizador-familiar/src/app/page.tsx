import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const person = await getCurrentPerson();
  redirect(person ? "/dia" : "/login");
}
