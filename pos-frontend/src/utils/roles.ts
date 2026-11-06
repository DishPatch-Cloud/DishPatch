export type StaffRole = "owner" | "manager" | "staff";

export const STAFF_ROLES: StaffRole[] = ["owner", "manager", "staff"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

// Users created before roles existed have no role. The backend treats them as owner, so the UI does too.
export const effectiveRole = (role?: string | null): StaffRole =>
  STAFF_ROLES.includes(role as StaffRole) ? (role as StaffRole) : "owner";

// Owners and managers can change the shared menu. Staff can only take orders.
export const canEditMenu = (role?: string | null): boolean => {
  const current = effectiveRole(role);
  return current === "owner" || current === "manager";
};
