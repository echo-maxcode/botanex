import { createFileRoute } from "@tanstack/react-router";
import { generateHistory, hasSensor } from "@/lib/sensors";

export const Route = createFileRoute("/api/sensor-readings/history/$plantId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const plantId = String(params.plantId ?? "").slice(0, 64);
        if (!/^[\w-]{1,64}$/.test(plantId)) {
          return new Response("Invalid plant id", { status: 400 });
        }
        if (!hasSensor(plantId)) {
          return Response.json(
            { plantId, connected: false, readings: [] },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        return Response.json(
          { plantId, connected: true, readings: generateHistory(plantId, 24, 30) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
