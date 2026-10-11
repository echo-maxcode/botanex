import { CalendarDays, Droplets, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  formatNextWateringText,
  logWatering,
  needsWater,
  type Plant,
} from "@/lib/plants";
import { PlantAvatar } from "@/components/plant-avatar";
import { PlantQrButton } from "@/components/plant-qr-dialog";
import { SensorReadout } from "@/components/sensor-readout";
import { SpeciesCareReadout } from "@/components/species-care-readout";

export function PlantCard({
  plant,
  onOpenEdit,
}: {
  plant: Plant;
  onOpenEdit?: () => void;
}) {
  const thirsty = needsWater(plant);
  const isSkipSuggested = plant.status === "SKIP_SUGGESTED";

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <PlantAvatar species={plant.species} />
        <div className="flex items-center gap-1">
          <PlantQrButton plant={plant} />
          {isSkipSuggested ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400"
              title={plant.statusReason ?? "Rain forecast in next 48h"}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
              Skip Suggested
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                thirsty
                  ? "bg-amber-warm/15 text-amber-warm-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${thirsty ? "bg-amber-warm" : "bg-primary"}`}
              />
              {thirsty ? "Needs Water" : "Recently Watered"}
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {plant.name}
      </h3>
      <p className="text-sm italic text-muted-foreground">{plant.species}</p>

      <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {plant.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> {formatNextWateringText(plant)}
        </span>
      </div>

      <SensorReadout plantId={plant.id} />

      <SpeciesCareReadout
        plantId={plant.id}
        species={plant.species}
        openplantbookPid={plant.openplantbookPid}
        compact={true}
        onOpenEdit={onOpenEdit}
      />

      <button
        onClick={() => {
          logWatering(plant.id);
          toast.success(`Watered ${plant.name} — +10 eco-points 🌱`);
        }}
        disabled={!thirsty}
        className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
          thirsty
            ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
            : "cursor-default bg-muted text-muted-foreground"
        }`}
      >
        <Droplets className="h-4 w-4" />
        {thirsty ? "Log Watering" : isSkipSuggested ? "Skip Suggested (Rain)" : "Watered"}
      </button>
    </div>
  );
}
