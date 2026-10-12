import { describe, expect, it } from "vitest";
import { publicSearch } from "@/lib/analytics";

describe("publicSearch", () => {
  it("drops the gift order's reference and unlock token", () => {
    expect(publicSearch("?ref=FP-1234&t=secret")).toBe("");
  });

  it("keeps campaign tags", () => {
    expect(publicSearch("?utm_source=npr&t=secret&utm_medium=print")).toBe("?utm_source=npr&utm_medium=print");
  });
});
