"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_NAV } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden sm:flex sm:flex-col gap-1 w-56 shrink-0 py-6 pr-4">
      {ALL_NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition"
            style={{
              color: active ? "var(--accent)" : "var(--foreground)",
              backgroundColor: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
            }}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
