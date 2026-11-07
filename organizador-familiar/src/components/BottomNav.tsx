"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 surface border-t flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      style={{ borderRadius: 0 }}
    >
      {PRIMARY_NAV.map((item) => {
        const active = pathname === item.href || (item.href === "/mas" && pathname.startsWith("/mas"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-xs font-medium min-w-[3.5rem]"
            style={{
              color: active ? "var(--accent)" : "var(--muted)",
              backgroundColor: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
            }}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
