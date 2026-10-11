import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  HeartHandshake,
  Info,
  Leaf,
  Link2,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { plantbookApi, type PlantRangeStatus, type SpeciesCareProfile, type MetricRangeStatus } from "@/api";

interface SpeciesCareReadoutProps {
  plantId: string | number;
  species: string;
  openplantbookPid?: string | null;
  compact?: boolean;
  onOpenEdit?: () => void;
}

export function SpeciesCareReadout({
  plantId,
  species,
  openplantbookPid,
  compact = false,
  onOpenEdit,
}: SpeciesCareReadoutProps) {
  const [rangeStatus, setRangeStatus] = useState<PlantRangeStatus | null>(null);
  const [careProfile, setCareProfile] = useState<SpeciesCareProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [rangesOpen, setRangesOpen] = useState(false);
  const [careTipsOpen, setCareTipsOpen] = useState(false);

  useEffect(() => {
    // If plant has no linked PID, do not spam API
    if (!openplantbookPid && !species) {
      setRangeStatus(null);
      setCareProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      plantbookApi.getRangeStatus(plantId),
      plantbookApi.getCareProfile(plantId),
    ])
      .then(([rangeRes, profileRes]) => {
        if (!isMounted) return;

        if (rangeRes.status === "fulfilled") {
          setRangeStatus(rangeRes.value);
        } else {
          setRangeStatus(null);
        }

        if (profileRes.status === "fulfilled") {
          setCareProfile(profileRes.value);
        } else {
          setCareProfile(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [plantId, openplantbookPid, species]);

  // If not linked or failed to load profile and range
  if (!loading && !rangeStatus && !careProfile) {
    if (onOpenEdit) {
      return (
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-dashed border-border/80 bg-accent/30 p-2.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-leaf/80" />
            <span>Species ideal ranges & tips</span>
          </div>
          <button
            type="button"
            onClick={onOpenEdit}
            className="inline-flex items-center gap-1 font-semibold text-primary transition hover:underline"
          >
            <Link2 className="h-3 w-3" />
            Link species
          </button>
        </div>
      );
    }
    return null;
  }

  // Filter metrics that have at least one bound defined (skip metrics with no range)
  const validMetrics = (rangeStatus?.metrics || []).filter(
    (m) => m.min !== null || m.max !== null
  );

  // Compute compact summary for collapsed Ideal Species Ranges panel
  const lowCount = validMetrics.filter((m) => m.status === "LOW").length;
  const highCount = validMetrics.filter((m) => m.status === "HIGH").length;
  const okCount = validMetrics.filter((m) => m.status === "OK").length;
  const hasReadingValues = validMetrics.some((m) => m.currentValue !== null);

  let rangeSummaryText = "All in range";
  let rangeDotColor = "bg-emerald-500";

  if (!hasReadingValues) {
    rangeSummaryText = "Awaiting sensor data";
    rangeDotColor = "bg-muted-foreground";
  } else if (lowCount > 0 && highCount > 0) {
    rangeSummaryText = `${lowCount} low, ${highCount} high`;
    rangeDotColor = "bg-amber-warm";
  } else if (lowCount > 0) {
    rangeSummaryText = `${lowCount} low`;
    rangeDotColor = "bg-sky-500";
  } else if (highCount > 0) {
    rangeSummaryText = `${highCount} high`;
    rangeDotColor = "bg-amber-warm";
  } else if (okCount > 0) {
    rangeSummaryText = "All in range";
    rangeDotColor = "bg-emerald-500";
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {/* 1. Collapsible Species Ideal Range Section */}
      {validMetrics.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-soft transition-all">
          <button
            type="button"
            onClick={() => setRangesOpen((prev) => !prev)}
            className="flex w-full items-center justify-between p-3 text-left transition hover:bg-accent/40"
            aria-expanded={rangesOpen}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ideal Species Ranges
            </span>
            <div className="flex items-center gap-2">
              {!rangesOpen && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${rangeDotColor}`} />
                  {rangeSummaryText}
                </span>
              )}
              {rangesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {rangesOpen && (
            <div className="px-3 pb-3 pt-1 border-t border-border/40 flex flex-col gap-2">
              <div className="mt-1 flex flex-col gap-2">
                {validMetrics.map((metric) => (
                  <MetricRow key={metric.metric} metric={metric} />
                ))}
              </div>

              {rangeStatus?.summary && (
                <p className="mt-1 text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                  {rangeStatus.summary}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Collapsible Care Tips Section */}
      {careProfile && (
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-soft transition-all">
          <button
            type="button"
            onClick={() => setCareTipsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between p-3 text-left transition hover:bg-accent/40"
            aria-expanded={careTipsOpen}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Species Care Tips
            </span>
            {careTipsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {careTipsOpen && (
            <div className="px-3 pb-3 pt-1 border-t border-border/40 flex flex-col gap-2 text-xs">
              {/* Fertilization Schedule */}
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <span className="font-semibold text-foreground block mb-0.5">
                  Fertilization
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {careProfile.fertilizationTip ||
                    "No specific fertilization guidelines recorded for this species."}
                </p>
              </div>

              {/* General Care Tips */}
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <span className="font-semibold text-foreground block mb-0.5">
                  General Care
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {careProfile.careTips ||
                    "No specific care tips available for this species."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricRangeStatus }) {
  const Icon = getMetricIcon(metric.metric);

  // Status chip styling
  let chipClass = "bg-secondary text-secondary-foreground border-transparent";
  let statusText = metric.status;

  if (metric.status === "OK") {
    chipClass =
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    statusText = "OK";
  } else if (metric.status === "LOW") {
    chipClass = "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20";
    statusText = "Low";
  } else if (metric.status === "HIGH") {
    chipClass =
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";
    statusText = "High";
  }

  // Format ideal range text
  let idealRangeText = "";
  if (metric.min !== null && metric.max !== null) {
    idealRangeText = `${metric.min}–${metric.max}${metric.unit}`;
  } else if (metric.min !== null) {
    idealRangeText = `≥ ${metric.min}${metric.unit}`;
  } else if (metric.max !== null) {
    idealRangeText = `≤ ${metric.max}${metric.unit}`;
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-muted-foreground font-medium">
          {metric.label}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Current vs Ideal */}
        <span className="font-medium text-foreground">
          {metric.currentValue !== null
            ? `${metric.currentValue}${metric.unit}`
            : "--"}
        </span>
        <span className="text-[11px] text-muted-foreground/80">
          (Ideal: {idealRangeText})
        </span>

        {/* Status Chip */}
        {metric.status && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${chipClass}`}
            title={metric.message}
          >
            {statusText}
          </span>
        )}
      </div>
    </div>
  );
}

function getMetricIcon(metric: string) {
  const m = metric.toLowerCase();
  if (m.includes("soil") || m.includes("moist")) return Droplets;
  if (m.includes("temp")) return Thermometer;
  if (m.includes("humid")) return Wind;
  return Info;
}
