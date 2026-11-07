"use client";

import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await apiSend("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="text-sm px-3 py-1.5 rounded-full"
      style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
    >
      Salir
    </button>
  );
}
