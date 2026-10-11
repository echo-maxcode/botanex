import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart3,
  Droplets,
  LayoutDashboard,
  Leaf,
  Sprout,
  Trophy,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { NotificationBell } from "./notification-bell";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plants", label: "Plants", icon: Sprout },
  { to: "/watering-log", label: "Watering Log", icon: Droplets },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const activeClass =
  "bg-primary text-primary-foreground shadow-soft";
const idleClass =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

// Routes reachable without an account: the QR-scan plant profiles (for expo
// visitors) and the login / register screens themselves.
function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/plant/") ||
    pathname === "/login" ||
    pathname === "/register"
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (!isPublic && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isPublic, isAuthenticated, navigate]);

  // Standalone routes render full-bleed, without sidebar or bottom tab bar.
  if (isPublic) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center justify-between px-4 pt-6 pb-5">
          <Link
            to="/"
            className="flex items-center gap-2.5 min-w-0"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold leading-tight text-foreground truncate">
              BOTANEX
              <span className="block text-[11px] font-normal text-muted-foreground truncate">
                Care & Water Log
              </span>
            </span>
          </Link>
          <NotificationBell />
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${idleClass}`}
              activeProps={{ className: activeClass }}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto m-3 rounded-2xl bg-cream p-4 text-sm text-cream-foreground">
          <p className="font-display font-semibold">Save every drop 💧</p>
          <p className="mt-1 text-xs opacity-80">
            Consistent watering can cut household water use by up to 20%.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="pb-24 md:pb-10 md:pl-60">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-5 pt-8 pb-6 sm:px-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5">
        {action}
        <NotificationBell />
      </div>
    </header>
  );
}
