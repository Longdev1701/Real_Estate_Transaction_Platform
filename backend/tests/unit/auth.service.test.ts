import { UserRole, UserStatus, type User } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildPublicUser } from "../../src/auth/auth.service.js";

const makeUser = (): User => ({
  id: "user_1",
  email: "architect@example.com",
  passwordHash: "hashed-password",
  fullName: "Senior Architect",
  phone: "0123456789",
  avatarUrl: "https://example.com/avatar.png",
  address: "District 1",
  bio: "Bio",
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
});

describe("buildPublicUser", () => {
  it("removes sensitive fields while preserving the frontend-facing profile shape", () => {
    const result = buildPublicUser(makeUser());

    expect(result).toEqual({
      id: "user_1",
      email: "architect@example.com",
      fullName: "Senior Architect",
      phone: "0123456789",
      address: "District 1",
      bio: "Bio",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
