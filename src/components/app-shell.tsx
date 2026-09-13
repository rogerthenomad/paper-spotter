import { Link, useRouterState } from "@tanstack/react-router";
import { Archive, Cpu, Layers, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import { SpotterMark } from "./mark";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Review", icon: PenLine },
  { to: "/engines", label: "Engines", icon: Layers },
  { to: "/models", label: "Models", icon: Cpu },
  { to: "/archive", label: "Archive", icon: Archive },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const locked = pathname === "/";

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to review
      </a>
      <aside className="hidden h-full w-48 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-1">
          <SpotterMark className="size-7" />
          <div>
            <div className="font-display text-base leading-none tracking-tight">Paper Spotter</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">
              PhD writing desk
            </div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-[var(--motion-quick)]",
                  active ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-2 text-[11px] leading-relaxed text-subtle">
          Signals, not proof. Accept a rewrite to rescore.
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <SpotterMark className="size-7" />
            <span className="font-display text-base">Paper Spotter</span>
          </Link>
        </header>
        <main
          id="main"
          className={cn(
            "min-h-0 flex-1",
            locked ? "overflow-hidden" : "overflow-y-auto px-4 py-5 sm:px-6",
          )}
        >
          {children}
        </main>
        <nav className="grid shrink-0 grid-cols-4 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
