export type PosRole = "admin" | "staff" | "customer";

export const POS_ROLES: PosRole[] = ["admin", "staff", "customer"];

export const ROLE_LABELS: Record<PosRole, string> = {
  admin: "Admin",
  staff: "Staff",
  customer: "Customer",
};

// Users created before these roles existed have no role, or still say owner or manager.
// Those accounts keep admin access. The backend uses the same mapping.
export const effectiveRole = (role?: string | null): PosRole => {
  if (role === "admin" || role === "staff" || role === "customer") return role;
  if (role === "owner" || role === "manager" || !role) return "admin";
  return "customer";
};

export const canEditMenu = (role?: string | null): boolean => effectiveRole(role) === "admin";

export const canViewRestaurant = (role?: string | null): boolean => {
  const current = effectiveRole(role);
  return current === "admin" || current === "staff";
};

export const canEditUsers = (role?: string | null): boolean => effectiveRole(role) === "admin";
