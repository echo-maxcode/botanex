import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, QrCode, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Plant } from "@/lib/plants";

/** Small icon button that opens the QR dialog for a plant. */
export function PlantQrButton({ plant }: { plant: Plant }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        aria-label={`Show QR code for ${plant.name}`}
        title="Show QR code"
      >
        <QrCode className="h-4 w-4" />
      </button>
      <PlantQrDialog plant={open ? plant : null} onClose={() => setOpen(false)} />
    </>
  );
}

export function PlantQrDialog({
  plant,
  onClose,
}: {
  plant: Plant | null;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!plant) return null;
  const url = `${origin}/plant/${plant.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-in w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="text-left">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {plant.name}
            </h2>
            <p className="text-xs italic text-muted-foreground">
              {plant.species}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cream p-5 shadow-soft">
          {origin ? (
            <QRCodeSVG
              value={url}
              size={176}
              level="M"
              bgColor="transparent"
              fgColor="#355c3a"
            />
          ) : (
            <div className="h-44 w-44" />
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Scan with a phone camera to open this plant's public profile.
        </p>
        <p className="mt-1 break-all text-[11px] text-muted-foreground/80">
          {url}
        </p>

        <Link
          to="/plant/$id"
          params={{ id: plant.id }}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4" /> Open profile page
        </Link>
      </div>
    </div>
  );
}
