import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PlantAvatar } from "@/components/plant-avatar";
import { PlantQrButton } from "@/components/plant-qr-dialog";
import {
  ConfirmDeleteDialog,
  PlantFormDialog,
} from "@/components/plant-form-dialog";
import {
  formatDate,
  needsWater,
  nextWateringDate,
  removePlant,
  usePlantStore,
  type Plant,
} from "@/lib/plants";

export const Route = createFileRoute("/plants")({
  head: () => ({
    meta: [
      { title: "Plants — Plant Care & Water-Saving Log" },
      {
        name: "description",
        content: "Add, edit, and manage your plant collection.",
      },
      { property: "og:title", content: "Plants — Plant Care & Water-Saving Log" },
      {
        property: "og:description",
        content: "Add, edit, and manage your plant collection.",
      },
    ],
  }),
  component: PlantsPage,
});

function PlantsPage() {
  const plants = usePlantStore((s) => s.plants);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);
  const [deleting, setDeleting] = useState<Plant | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plants;
    return plants.filter((p) =>
      [p.name, p.species, p.location].some((f) => f.toLowerCase().includes(q)),
    );
  }, [plants, query]);

  return (
    <div>
      <PageHeader
        title="My Plants"
        subtitle="Manage your collection — add, edit, or remove plants."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add Plant
          </button>
        }
      />

      <div className="px-5 sm:px-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, species, or location…"
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground shadow-soft outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No plants match “{query}”.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const thirsty = needsWater(p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <PlantAvatar species={p.species} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display font-semibold text-foreground">
                        {p.name}
                      </h3>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${thirsty ? "bg-amber-warm" : "bg-primary"}`}
                        title={thirsty ? "Needs water" : "Recently watered"}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs italic text-muted-foreground">
                        {p.species} · {p.location}
                      </p>
                      {p.openplantbookPid && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                          title={`Linked to OpenPlantbook species profile (${p.openplantbookPid})`}
                        >
                          <Leaf className="h-2.5 w-2.5" />
                          Synced
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Every {p.frequencyDays}d ·{" "}
                      {nextWateringDate(p)
                        ? `next ${formatDate(nextWateringDate(p))}`
                        : "no watering scheduled yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <PlantQrButton plant={p} />
                    <button
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlantFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        plant={editing}
      />
      <ConfirmDeleteDialog
        plant={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removePlant(deleting.id);
            toast.success(`${deleting.name} removed`);
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
