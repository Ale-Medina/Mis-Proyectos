import Link from "next/link";
import { ALL_NAV } from "@/components/nav-items";

export default function MasPage() {
  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-4">Más</h1>
      <div className="grid grid-cols-2 gap-3">
        {ALL_NAV.map((n) => (
          <Link key={n.href} href={n.href} className="surface flex items-center gap-3 px-4 py-4 font-medium">
            <span className="text-xl">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
