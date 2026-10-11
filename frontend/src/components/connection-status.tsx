import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

export function LoadingSpinner({ label = "Loading data from backend…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ConnectionErrorBanner({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  if (!error) return null;

  const isAuthError =
    error.toLowerCase().includes("unauthorized") ||
    error.toLowerCase().includes("401") ||
    error.toLowerCase().includes("auth");

  const title = isAuthError
    ? "Authentication Required"
    : "Backend Server Notice (http://localhost:8080)";

  return (
    <div className="mx-5 mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-warm/30 bg-amber-warm/10 p-4 text-sm text-amber-warm-foreground shadow-soft sm:mx-8">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-warm" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-90">
            {error || "Could not fetch live data. Showing cached offline data."}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-warm/40 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft transition hover:bg-amber-warm/20 active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
