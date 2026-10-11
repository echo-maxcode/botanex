import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  AuthFormShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/auth-form-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — BOTANEX" },
      {
        name: "description",
        content: "Log in to BOTANEX to track your plants, waterings and eco-points.",
      },
      { property: "og:title", content: "Log In — BOTANEX" },
      {
        property: "og:description",
        content: "Log in to BOTANEX to track your plants, waterings and eco-points.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Log in to pick up where your plants left off."
      footer={
        <>
          New to BOTANEX?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={authButtonClass}>
          {busy ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="mt-4 rounded-xl bg-cream px-3.5 py-2.5 text-xs text-cream-foreground">
        Demo account: <strong>alice@example.com</strong> / <strong>password123</strong>
      </p>
    </AuthFormShell>
  );
}
