import type { UserRole, UserStatus } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
};
