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

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to review
      </a>
      <div className="mx-auto flex min-h-dvh max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-1">
            <SpotterMark className="size-8" />
            <div>
              <div className="font-display text-lg leading-none tracking-tight">Paper Spotter</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">
                AI writing review
              </div>
            </div>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-[var(--motion-quick)]",
                    active ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-3 text-[11px] leading-relaxed text-subtle">
            Underlines are signals, not proof. Accept a rewrite to rescore the page.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <Link to="/" className="flex items-center gap-2">
              <SpotterMark className="size-7" />
              <span className="font-display text-base">Paper Spotter</span>
            </Link>
          </header>
          <main id="main" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
          <nav className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] md:hidden">
            {NAV.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
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
    </div>
  );
}
