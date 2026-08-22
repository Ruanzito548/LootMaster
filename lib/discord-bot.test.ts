import { describe, expect, it } from "vitest";

import { normalizeDiscordOrderMetadata } from "./discord-bot";

describe("normalizeDiscordOrderMetadata", () => {
  it("rewrites stale TBC anniversary values back to the canonical game/server label", () => {
    expect(
      normalizeDiscordOrderMetadata({
        gameId: "tbc-anniversary",
        gameTitle: "World of Warcraft Midnight",
        serverId: "nightslayer-us",
        server: "Nightslayer US",
      }),
    ).toEqual({
      gameTitle: "World of Warcraft TBC Anniversary",
      server: "Nightslayer US",
    });
  });

  it("falls back to the canonical server name when only the server id is known", () => {
    expect(
      normalizeDiscordOrderMetadata({
        gameId: "tbc-anniversary",
        gameTitle: "World of Warcraft TBC Anniversary",
        serverId: "spineshatter-eu",
        server: "",
      }),
    ).toEqual({
      gameTitle: "World of Warcraft TBC Anniversary",
      server: "Spineshatter EU",
    });
  });
});
