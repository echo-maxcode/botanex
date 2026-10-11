import { Leaf } from "lucide-react";
import type { ReactNode } from "react";

export function AuthFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold leading-tight text-foreground">
            BOTANEX
            <span className="block text-xs font-normal text-muted-foreground">
              Plant Care &amp; Water-Saving Log
            </span>
          </span>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

export const authLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const authButtonClass =
  "w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
