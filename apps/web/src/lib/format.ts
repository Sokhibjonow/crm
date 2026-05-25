const LOCALE_TO_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-Latn-UZ',
};

export function formatMoney(value: string | number, locale = 'ru'): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  const bcp = LOCALE_TO_BCP47[locale] ?? 'ru-RU';
  return new Intl.NumberFormat(bcp, {
    style: 'decimal',
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatStock(n: number, locale = 'ru'): string {
  const bcp = LOCALE_TO_BCP47[locale] ?? 'ru-RU';
  return new Intl.NumberFormat(bcp).format(n);
}
