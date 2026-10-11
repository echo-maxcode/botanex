import { useEffect, useRef, useState } from "react";
import { Check, Leaf, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { addPlant, updatePlant, type Plant } from "@/lib/plants";
import { plantbookApi, type PlantSearchResult } from "@/api";

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

export function PlantFormDialog({
  open,
  onClose,
  plant,
}: {
  open: boolean;
  onClose: () => void;
  plant?: Plant | null;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [openplantbookPid, setOpenplantbookPid] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [frequency, setFrequency] = useState(7);

  // Search state
  const [searchResults, setSearchResults] = useState<PlantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setName(plant?.name ?? "");
      setSpecies(plant?.species ?? "");
      setOpenplantbookPid(plant?.openplantbookPid ?? null);
      setLocation(plant?.location ?? "");
      setFrequency(plant?.frequencyDays ?? 7);
      setSearchResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  }, [open, plant]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search-as-you-type species query (min 3 chars)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = species.trim();
    if (!apiConfigured || trimmed.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await plantbookApi.search(trimmed);
        setSearchResults(results || []);
        setShowDropdown((results && results.length > 0) || false);
        setHighlightedIndex(-1);
      } catch (err: any) {
        // If API returns "not configured", degrade gracefully to plain text input without user errors
        if (
          (err?.status === 400 || err?.status === 503) &&
          (err?.data?.error === "NOT_CONFIGURED" ||
            (typeof err?.data?.message === "string" && err.data.message.includes("not configured")))
        ) {
          setApiConfigured(false);
        }
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [species, apiConfigured]);

  const handleSpeciesChange = (value: string) => {
    setSpecies(value);
    // If the user modified text away from previously selected PID, clear PID
    if (openplantbookPid && value.trim().toLowerCase() !== openplantbookPid.toLowerCase()) {
      setOpenplantbookPid(null);
    }
  };

  const handleSelectSpecies = (item: PlantSearchResult) => {
    setSpecies(item.displayPid || item.pid);
    setOpenplantbookPid(item.pid);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSpecies(searchResults[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  if (!open) return null;

  const valid = name.trim() && species.trim() && location.trim() && frequency > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    const trimmedSpecies = species.trim();
    // Resolve PID from selected PID, top search result match, or normalized species name
    const topResult = searchResults[0];
    const topMatches =
      topResult &&
      (topResult.pid.toLowerCase() === trimmedSpecies.toLowerCase() ||
        topResult.displayPid?.toLowerCase() === trimmedSpecies.toLowerCase() ||
        topResult.alias?.toLowerCase().includes(trimmedSpecies.toLowerCase()));

    const resolvedPid = openplantbookPid || (topMatches ? topResult.pid : trimmedSpecies.toLowerCase());

    const data = {
      name: name.trim(),
      species: trimmedSpecies,
      location: location.trim(),
      frequencyDays: frequency,
      openplantbookPid: resolvedPid,
    };
    if (plant) {
      updatePlant(plant.id, data);
      toast.success(`${data.name} updated & linked to species`);
    } else {
      addPlant(data);
      toast.success(`${data.name} added to your garden 🌿`);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {plant ? "Edit Plant" : "Add a Plant"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Name
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monty"
              autoFocus
            />
          </label>

          <div ref={dropdownRef} className="relative flex flex-col gap-1.5 text-sm font-medium text-foreground">
            <div className="flex items-center justify-between">
              <span>Species</span>
              {openplantbookPid && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  Linked to OpenPlantbook
                </span>
              )}
            </div>

            <div className="relative">
              <input
                className={inputClass}
                value={species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Monstera Deliciosa (min 3 chars to search)"
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Species Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lift"
                role="listbox"
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  OpenPlantbook Species
                </div>
                {searchResults.map((item, index) => {
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={item.pid}
                      type="button"
                      onClick={() => handleSelectSpecies(item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition ${
                        isHighlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                      }`}
                      role="option"
                      aria-selected={item.pid === openplantbookPid}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-medium text-foreground text-sm">
                          {item.displayPid || item.pid}
                        </span>
                        {item.pid === openplantbookPid && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      {item.alias && (
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {item.alias}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Location
            <input
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Living Room"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Watering frequency (days)
            <input
              type="number"
              min={1}
              max={60}
              className={inputClass}
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
            />
          </label>

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {plant ? "Save Changes" : "Add Plant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDeleteDialog({
  plant,
  onCancel,
  onConfirm,
}: {
  plant: Plant | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!plant) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-foreground">
          Remove {plant.name}?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This will permanently remove the plant and its watering history. This
          action can't be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Keep Plant
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition hover:brightness-110 active:scale-[0.98]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
