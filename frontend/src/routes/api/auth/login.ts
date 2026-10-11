import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { findByEmail, hashPassword, signToken, toPublic } = await import(
          "@/lib/auth.server"
        );

        let body: { email?: string; password?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const email = String(body.email ?? "").trim();
        const password = String(body.password ?? "");
        if (!email || !password) {
          return Response.json(
            { error: "Email and password are required." },
            { status: 400 },
          );
        }

        const user = await findByEmail(email);
        if (!user || user.passwordHash !== (await hashPassword(password))) {
          return Response.json(
            { error: "Incorrect email or password." },
            { status: 401 },
          );
        }

        return Response.json(
          { token: await signToken(user.id), user: toPublic(user) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
