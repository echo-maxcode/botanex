import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Award,
  CalendarDays,
  LogOut,
  Mail,
  Leaf,
  Sparkles,
  Sprout,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth, type AuthUser } from "@/lib/auth-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BOTANEX" },
      {
        name: "description",
        content: "Your BOTANEX gardener profile, eco-points, badges and plants.",
      },
      { property: "og:title", content: "Profile — BOTANEX" },
      {
        property: "og:description",
        content: "Your BOTANEX gardener profile, eco-points, badges and plants.",
      },
    ],
  }),
  component: ProfilePage,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function ProfilePage() {
  const { authFetch, logout, token, user: cachedUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AuthUser | null>(cachedUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (!token) return; // redirect to /login is handled by the app shell
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/users/me");
        if (!res.ok) throw new Error("Could not load your profile.");
        const data = (await res.json()) as AuthUser;
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, token]);

  function handleLogout() {
    logout();
    navigate({ to: "/login", replace: true });
  }

  const stats = [
    {
      label: "Eco-points",
      value: profile?.ecoPoints ?? 0,
      icon: Sparkles,
    },
    { label: "Badges earned", value: profile?.badgeCount ?? 0, icon: Award },
    { label: "Plants cared for", value: profile?.plantCount ?? 0, icon: Sprout },
  ];

  const initials = (profile?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Your gardener identity and progress."
        action={
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft transition hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        }
      />

      <div className="px-5 pb-10 sm:px-8">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-soft">
            Loading your profile…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl bg-destructive/10 p-5 text-sm text-destructive">
            {error}
          </div>
        )}

        {profile && !loading && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display text-xl font-semibold text-primary-foreground shadow-soft">
                {initials || <Leaf className="h-7 w-7" />}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {profile.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> Member since{" "}
                  {formatDate(profile.memberSince)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream text-cream-foreground">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-3 font-display text-2xl font-semibold text-foreground">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
