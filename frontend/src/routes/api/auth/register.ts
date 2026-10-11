import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createUser, findByEmail, signToken, toPublic } = await import(
          "@/lib/auth.server"
        );

        let body: { name?: string; email?: string; password?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const name = String(body.name ?? "").trim();
        const email = String(body.email ?? "").trim();
        const password = String(body.password ?? "");

        if (!name || !email || !password) {
          return Response.json(
            { error: "Name, email and password are all required." },
            { status: 400 },
          );
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }
        if (password.length < 6) {
          return Response.json(
            { error: "Password must be at least 6 characters." },
            { status: 400 },
          );
        }
        if (await findByEmail(email)) {
          return Response.json(
            { error: "An account with that email already exists." },
            { status: 409 },
          );
        }

        const user = await createUser(name, email, password);
        return Response.json(
          { token: await signToken(user.id), user: toPublic(user) },
          { status: 201, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
