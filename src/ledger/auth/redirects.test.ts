import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  it("keeps in-app paths, including query strings", () => {
    expect(safeNextPath("/refunds")).toBe("/refunds");
    expect(safeNextPath("/refunds/rf_9028")).toBe("/refunds/rf_9028");
    expect(safeNextPath("/admin/audit?outcome=DENIED")).toBe(
      "/admin/audit?outcome=DENIED",
    );
  });

  it("falls back for anything that could leave the application", () => {
    for (const value of [
      undefined,
      "",
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "javascript:alert(1)",
      "refunds",
    ]) {
      expect(safeNextPath(value)).toBe("/refunds");
    }
  });
});
