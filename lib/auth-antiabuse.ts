import crypto from "node:crypto";

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashRequestIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET?.trim() || process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("IP_HASH_SECRET is not configured.");
  }

  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}
