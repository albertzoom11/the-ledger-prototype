import { beforeEach, describe, expect, it } from "vitest";
import { listAuditEvents } from "@/ledger/audit/auditService";
import { getAccessOverview } from "@/ledger/auth/accessService";
import { ForbiddenError } from "@/ledger/auth/actor";
import { accessPolicy } from "@/platform/access";
import { ADMIN, REVIEWER, resetDatabase } from "./fixtures";

/**
 * Administrative *reads* are authorised in the service, so hiding the nav item
 * or the screen is never what protects them.
 */

beforeEach(() => {
  resetDatabase();
});

describe("audit log reads", () => {
  it("refuses a reviewer and names the missing permission", () => {
    try {
      listAuditEvents(REVIEWER, {});
      expect.unreachable("reviewer must not read the audit log");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      if (error instanceof ForbiddenError) {
        expect(error.permission).toBe("audit:view");
      }
    }
  });

  it("allows an admin and ignores an unregistered outcome filter", () => {
    const view = listAuditEvents(ADMIN, { outcome: "'; DROP TABLE audit_events; --" });
    expect(view.page.items).toEqual([]);
    expect(view.page.total).toBe(0);
  });
});

describe("access control reads", () => {
  it("refuses a reviewer", () => {
    expect(() => getAccessOverview(REVIEWER, accessPolicy)).toThrow(ForbiddenError);
  });

  it("gives an admin the directory and the installed permission groups", () => {
    const overview = getAccessOverview(ADMIN, accessPolicy);

    expect(overview.users.map((user) => user.id)).toContain(ADMIN.id);
    expect(
      overview.groups.flatMap((group) => group.permissions).map((p) => p.key),
    ).toContain("refunds:decide_high_value");
  });
});
