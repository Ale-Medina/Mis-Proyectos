import { LogoutButton } from "./LogoutButton";
import type { CurrentPerson } from "@/lib/auth";

export function Header({ person }: { person: CurrentPerson }) {
  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-2.5">
        <span
          className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: person.colorHex }}
        >
          {person.name.charAt(0)}
        </span>
        <div>
          <p className="font-semibold leading-tight">{person.name}</p>
          <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>
            Organizador Familiar
          </p>
        </div>
      </div>
      <LogoutButton />
    </header>
  );
}
