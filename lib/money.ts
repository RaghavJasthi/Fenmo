const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseAmountToMinor(amount: string | number): number {
  const normalized =
    typeof amount === "number" ? amount.toString() : amount.trim().replace(/,/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Amount must be a valid positive number with up to two decimals.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0"), 10);

  if (!Number.isFinite(minor) || minor <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  return minor;
}

export function formatMinorAsCurrency(amountMinor: number): string {
  return currencyFormatter.format(amountMinor / 100);
}
