export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm py-3 px-1" style={{ color: "var(--muted)" }}>
      {text}
    </p>
  );
}
