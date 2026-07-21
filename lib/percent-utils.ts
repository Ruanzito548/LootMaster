function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return Math.round(value * 100) / 100;
}

export function clampPercent(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizePercent(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return normalizePercent(parsed);
    }
  }

  return normalizePercent(fallback);
}
