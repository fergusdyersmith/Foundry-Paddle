// Query parameters that are keys, not tracking. The gift thank-you page is reached as
// /gift/thanks?ref=<order>&t=<token>, and that token unlocks the order's gift codes and
// its certificate PDF: anyone who could read the GA property could have redeemed them.
// (GiftThanks also wipes them from the address bar once read, which covers the events GA
// sends on its own; this covers the page view.)
const PRIVATE_PARAMS = ["t", "token", "ref"];

/** `search` without the private parameters, keeping UTM tags and the like. */
export function publicSearch(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of PRIVATE_PARAMS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}
