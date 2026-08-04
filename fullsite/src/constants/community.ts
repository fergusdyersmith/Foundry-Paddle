// Invite to the Foundry Padel WhatsApp community group.
//
// Anti-spam: the URL is kept base64-encoded (not as a plaintext string) so it
// can't be grepped out of the JS bundle, and it is only ever opened via
// window.open on a click — it is never written into the HTML/DOM as an href
// for crawlers to harvest. Decode at the point of use with this helper.
const ENCODED_WHATSAPP_COMMUNITY =
  "aHR0cHM6Ly9jaGF0LndoYXRzYXBwLmNvbS9LclhIN2xVc1BmdEhIZ09PVlZjMktp";

export function openWhatsAppCommunity() {
  if (typeof window === "undefined") return;
  window.open(whatsAppCommunityUrl(), "_blank", "noopener,noreferrer");
}

/** The invite URL as a value, for the few places that need the string itself
 *  rather than a click handler — currently only the /tv wall-screen QR code.
 *  Decoding here keeps the literal out of the bundle; a hardcoded copy anywhere
 *  else puts it straight back in, which is what this file exists to prevent. */
export function whatsAppCommunityUrl(): string {
  return atob(ENCODED_WHATSAPP_COMMUNITY);
}
