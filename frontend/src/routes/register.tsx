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

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — BOTANEX" },
      {
        name: "description",
        content: "Create a BOTANEX account to log waterings and earn eco-points.",
      },
      { property: "og:title", content: "Create Account — BOTANEX" },
      {
        property: "og:description",
        content: "Create a BOTANEX account to log waterings and earn eco-points.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Start tracking plants and saving water today."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={authLabelClass}>
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={authInputClass}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="you@example.com"
            autoComplete="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            minLength={6}
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
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthFormShell>
  );
}
