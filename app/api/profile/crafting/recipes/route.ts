import { CRAFT_RECIPES } from "@/lib/rpg-system";

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    recipes: CRAFT_RECIPES,
  });
}
