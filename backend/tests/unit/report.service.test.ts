import { PostStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getPostStatusForAppealDecision } from "../../src/reports/report.service.js";

describe("getPostStatusForAppealDecision", () => {
  it("reopens posts only when the appeal is approved", () => {
    expect(getPostStatusForAppealDecision("APPROVE")).toBe(PostStatus.ACTIVE);
    expect(getPostStatusForAppealDecision("REJECT")).toBe(PostStatus.BANNED);
  });
});
