import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-5xl flex px-4 sm:px-6">
        <Sidebar />
        <div className="flex-1 min-w-0 pb-24 sm:pb-10">
          <Header person={person} />
          <main>{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
