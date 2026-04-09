/** ISO 3166-1 alpha-2, E.164 country calling code (digits only), English name. Keep in sync across apps via @shared import. */
export type CountryDialOption = {
  code: string;
  dial: string;
  name: string;
};

/** E.164: + then 7–15 total digits (ITU max). */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export const COUNTRY_DIAL_CODES: CountryDialOption[] = [
  { code: "US", dial: "1", name: "United States" },
  { code: "CA", dial: "1", name: "Canada" },
  { code: "GB", dial: "44", name: "United Kingdom" },
  { code: "IE", dial: "353", name: "Ireland" },
  { code: "FR", dial: "33", name: "France" },
  { code: "DE", dial: "49", name: "Germany" },
  { code: "ES", dial: "34", name: "Spain" },
  { code: "IT", dial: "39", name: "Italy" },
  { code: "NL", dial: "31", name: "Netherlands" },
  { code: "BE", dial: "32", name: "Belgium" },
  { code: "CH", dial: "41", name: "Switzerland" },
  { code: "AT", dial: "43", name: "Austria" },
  { code: "PT", dial: "351", name: "Portugal" },
  { code: "SE", dial: "46", name: "Sweden" },
  { code: "NO", dial: "47", name: "Norway" },
  { code: "DK", dial: "45", name: "Denmark" },
  { code: "FI", dial: "358", name: "Finland" },
  { code: "PL", dial: "48", name: "Poland" },
  { code: "CZ", dial: "420", name: "Czechia" },
  { code: "GR", dial: "30", name: "Greece" },
  { code: "AU", dial: "61", name: "Australia" },
  { code: "NZ", dial: "64", name: "New Zealand" },
  { code: "JP", dial: "81", name: "Japan" },
  { code: "KR", dial: "82", name: "South Korea" },
  { code: "SG", dial: "65", name: "Singapore" },
  { code: "AE", dial: "971", name: "United Arab Emirates" },
  { code: "SA", dial: "966", name: "Saudi Arabia" },
  { code: "ZA", dial: "27", name: "South Africa" },
  { code: "BR", dial: "55", name: "Brazil" },
  { code: "MX", dial: "52", name: "Mexico" },
  { code: "AR", dial: "54", name: "Argentina" },
  { code: "IN", dial: "91", name: "India" },
  { code: "CN", dial: "86", name: "China" },
  { code: "HK", dial: "852", name: "Hong Kong" },
  { code: "TW", dial: "886", name: "Taiwan" },
  { code: "PH", dial: "63", name: "Philippines" },
  { code: "TH", dial: "66", name: "Thailand" },
  { code: "MY", dial: "60", name: "Malaysia" },
  { code: "ID", dial: "62", name: "Indonesia" },
  { code: "IL", dial: "972", name: "Israel" },
  { code: "TR", dial: "90", name: "Türkiye" },
  { code: "RU", dial: "7", name: "Russia" },
  { code: "UA", dial: "380", name: "Ukraine" },
].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export function maxNationalDigits(dialDigits: string): number {
  return Math.max(0, 15 - dialDigits.length);
}

export function composeE164(dialDigits: string, nationalDigits: string): string {
  return `+${dialDigits}${nationalDigits}`;
}
