import { CHEST_IDS, type ChestId } from "@/lib/chests";
import { getLootOddsForPreview } from "@/lib/chest-loot";

export async function GET(): Promise<Response> {
  try {
    const byChest = CHEST_IDS.reduce((acc, chestId) => {
      acc[chestId] = {
        rewardOdds: getLootOddsForPreview(chestId),
      };
      return acc;
    }, {} as Record<ChestId, { rewardOdds: Array<{ type: string; weight: number }> }>);

    return Response.json({
      ok: true,
      config: {
        byChest,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load chest config.";
    return Response.json({ error: message }, { status: 500 });
  }
}
