/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { upsertProfile } from "./klaviyoProfile.js";

/** A fake Klaviyo: the email is taken by P1, whose stored properties are `stored`. */
function fakeKlaviyo({ exists = true, stored = {}, getStatus = 200 } = {}) {
  const calls = [];
  const klaviyo = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === "POST") {
      return exists
        ? { status: 409, json: { errors: [{ meta: { duplicate_profile_id: "P1" } }] } }
        : { status: 201, json: {} };
    }
    if (method === "GET") return { status: getStatus, json: { data: { attributes: { properties: stored } } } };
    return { status: 200, json: {} };
  };
  return { klaviyo, calls, patch: () => calls.find((c) => c.method === "PATCH")?.body.data.attributes.properties };
}

const attrs = {
  email: "someone@example.com",
  phone_number: "+15035550100",
  properties: { signup_source: "contact", sms_consent: true, interests: ["clinics"], level: "new" },
};

describe("upsertProfile", () => {
  it("describes a new profile in full", async () => {
    const k = fakeKlaviyo({ exists: false });
    expect(await upsertProfile(k.klaviyo, attrs)).toBe("created");
    expect(k.calls).toHaveLength(1);
    expect(k.calls[0].body.data.attributes).toEqual(attrs);
  });

  it("never writes consent or a signup source onto someone's existing profile", async () => {
    const k = fakeKlaviyo();
    expect(await upsertProfile(k.klaviyo, attrs)).toBe("updated");
    expect(k.patch()).toEqual({ interests: ["clinics"], level: "new" });
  });

  it("adds to a listed property rather than replacing it", async () => {
    const k = fakeKlaviyo({ stored: { interests: ["coaching", "clinics"] } });
    await upsertProfile(k.klaviyo, attrs, { union: ["interests"] });
    expect(k.patch().interests).toEqual(["coaching", "clinics"]);
  });

  it("leaves the list alone when the current one cannot be read", async () => {
    const k = fakeKlaviyo({ getStatus: 500 });
    await upsertProfile(k.klaviyo, attrs, { union: ["interests"] });
    expect(k.patch()).toEqual({ level: "new" });
  });

  it("sends no PATCH when nothing is left to write", async () => {
    const k = fakeKlaviyo();
    await upsertProfile(k.klaviyo, { email: "x@example.com", properties: { sms_consent: false } });
    expect(k.calls.map((c) => c.method)).toEqual(["POST"]);
  });

  it("throws on anything but created or duplicate", async () => {
    const klaviyo = async () => ({ status: 400, json: { errors: [{ detail: "bad" }] } });
    await expect(upsertProfile(klaviyo, attrs)).rejects.toThrow(/klaviyo profile 400/);
  });
});
