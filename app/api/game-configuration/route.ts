import { getLiveGameConfiguration } from "@/lib/game-configuration.server";

export async function GET(): Promise<Response> {
  try {
    const config = await getLiveGameConfiguration();
    return Response.json({ ok: true, config });
  } catch {
    return Response.json({ ok: true, config: null });
  }
}
