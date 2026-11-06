import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";

import { getStaff, setStaffRole } from "../../https";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "../../utils/roles";

interface StaffMember {
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
}

interface StaffRolesProps {
  currentUserId: string;
}

const StaffRoles = ({ currentUserId }: StaffRolesProps) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    getStaff()
      .then((response) => setStaff(response.data.data))
      .catch(() => enqueueSnackbar("Could not load staff.", { variant: "error" }))
      .finally(() => setIsLoading(false));
  }, []);

  const changeRole = async (member: StaffMember, role: StaffRole) => {
    setSavingUserId(member.userId);
    try {
      await setStaffRole(member.userId, role);
      setStaff((current) =>
        current.map((item) => (item.userId === member.userId ? { ...item, role } : item))
      );
      enqueueSnackbar(`${member.name} is now ${ROLE_LABELS[role]}.`, { variant: "success" });
    } catch (error) {
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      enqueueSnackbar(message || "Could not change the role.", { variant: "error" });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">Staff access</h2>
      <p className="mt-1 text-xs leading-5 text-text-secondary">
        Everyone in this location shares the same menu. Owners and managers can edit it.
        Staff can take orders but cannot change the menu.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading staff...</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {staff.map((member) => {
            const isSelf = member.userId === currentUserId;
            return (
              <li key={member.userId} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {member.name}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{member.email}</p>
                </div>

                <select
                  aria-label={`Role for ${member.name}`}
                  value={member.role}
                  disabled={isSelf || savingUserId === member.userId}
                  onChange={(event) => changeRole(member, event.target.value as StaffRole)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary disabled:opacity-60"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default StaffRoles;
