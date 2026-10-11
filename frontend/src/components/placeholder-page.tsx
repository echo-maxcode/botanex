import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app-shell";

export function PlaceholderPage({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mx-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-soft sm:mx-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage text-leaf">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
          Coming soon
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This section is on the roadmap — the Dashboard and Plants pages are
          fully functional in the meantime.
        </p>
      </div>
    </div>
  );
}
