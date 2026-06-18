import { getLiveChestSystemConfig } from "@/lib/chest-config";

export async function GET(): Promise<Response> {
  try {
    const config = await getLiveChestSystemConfig();

    return Response.json({
      ok: true,
      config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load chest config.";
    return Response.json({ error: message }, { status: 500 });
  }
}
