/**
 * Create a Klaviyo profile, or tag the one that already holds this email.
 *
 * Every caller is a public form, and nobody's email is verified there: anyone can type
 * anyone's address. A NEW profile is theirs to describe in full. An EXISTING one takes
 * only what this registration says about itself, and never:
 *
 *   - sms_consent. A PATCH does not change the profile's phone_number, so the number on
 *     file is not the one typed into this form. Writing consent would record a stranger
 *     agreeing to texts on somebody else's phone, which is a 10DLC consent record that
 *     is simply false.
 *   - signup_source. Where a person first came from stays where they came from.
 *   - a list named in `union` (the interest form's `interests`) is added to, never
 *     replaced, so a stranger cannot wipe what a subscriber asked to hear about. If the
 *     current list cannot be read, the list is left alone rather than overwritten.
 *
 * `klaviyo(method, path, body)` resolves to { status, json }.
 */
export async function upsertProfile(klaviyo, attrs, { union = [] } = {}) {
  const create = await klaviyo("POST", "/profiles", { data: { type: "profile", attributes: attrs } });
  if (create.status === 201) return "created";
  if (create.status !== 409) {
    throw new Error(`klaviyo profile ${create.status}: ${JSON.stringify(create.json ?? {}).slice(0, 200)}`);
  }
  const id = create.json?.errors?.[0]?.meta?.duplicate_profile_id;
  if (!id) return "exists";

  const { sms_consent, signup_source, ...properties } = attrs.properties ?? {};
  const unionKeys = union.filter((k) => Array.isArray(properties[k]) && properties[k].length);
  if (unionKeys.length) {
    const current = await klaviyo("GET", `/profiles/${id}`);
    const have = current.status === 200 ? (current.json?.data?.attributes?.properties ?? {}) : null;
    for (const k of unionKeys) {
      if (!have) {
        delete properties[k];
        continue;
      }
      const prev = Array.isArray(have[k]) ? have[k] : [];
      properties[k] = [...new Set([...prev, ...properties[k]])];
    }
  }
  if (Object.keys(properties).length) {
    await klaviyo("PATCH", `/profiles/${id}`, { data: { type: "profile", id, attributes: { properties } } });
  }
  return "updated";
}
