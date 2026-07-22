export function normalizeGoldPriceInput(value: string) {
  const trimmedValue = value.replace(/\s/g, "");

  if (trimmedValue.includes(",") && !trimmedValue.includes(".")) {
    return trimmedValue.replace(",", ".");
  }

  return trimmedValue;
}

export function parseGoldPriceInput(value: string) {
  const normalizedValue = normalizeGoldPriceInput(value);

  if (normalizedValue === "") {
    return null;
  }

  if (normalizedValue === "." || normalizedValue === ",") {
    return null;
  }

  if (/^\d+\.$/.test(normalizedValue) || /^\d+,?$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}
