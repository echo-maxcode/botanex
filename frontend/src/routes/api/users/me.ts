import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/users/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { userFromRequest, toPublic } = await import("@/lib/auth.server");
        const user = await userFromRequest(request);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return Response.json(toPublic(user), {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
