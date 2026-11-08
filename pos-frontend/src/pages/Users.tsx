import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";

import BottomNav from "../components/shared/BottomNav";
import { getStaff, setStaffRole } from "../https";
import type { RootState } from "../redux/store";
import { canEditUsers, canViewRestaurant, POS_ROLES, ROLE_LABELS, type PosRole } from "../utils/roles";

interface LocationUser {
  userId: string;
  name?: string;
  email?: string;
  role: PosRole;
}

const Users = () => {
  const queryClient = useQueryClient();
  const current = useSelector((state: RootState) => state.user);
  const allowed = canViewRestaurant(current.role);
  const editable = canEditUsers(current.role);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "POS | Users";
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: getStaff,
    enabled: allowed,
  });

  useEffect(() => {
    if (isError) enqueueSnackbar("Could not load users.", { variant: "error" });
  }, [isError]);

  if (!allowed) return <Navigate to="/menu" replace />;

  const users: LocationUser[] = data?.data?.data ?? [];

  const changeRole = async (member: LocationUser, role: PosRole) => {
    setSavingUserId(member.userId);
    try {
      await setStaffRole(member.userId, role);
      queryClient.setQueryData(["users"], (currentData: { data?: { data?: LocationUser[] } } | undefined) => {
        if (!currentData?.data?.data) return currentData;
        return {
          ...currentData,
          data: {
            ...currentData.data,
            data: currentData.data.data.map((item) =>
              item.userId === member.userId ? { ...item, role } : item
            ),
          },
        };
      });
      enqueueSnackbar(`${member.name || member.email} is now ${ROLE_LABELS[role]}.`, { variant: "success" });
    } catch (error) {
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      enqueueSnackbar(message || "Could not change the permission.", { variant: "error" });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <section className="h-[calc(100dvh-5rem)] overflow-hidden bg-background font-sans">
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-4 py-5 scrollbar-hide sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Users</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {editable
                ? "Everyone at this location. Click a permission to change it."
                : "Everyone at this location. An admin can change permissions."}
            </p>
          </header>

          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            {isLoading ? (
              <p className="px-5 py-8 text-sm text-text-secondary">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="px-5 py-8 text-sm text-text-secondary">No users yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {users.map((member) => {
                  const isSelf = member.userId === current.userId;
                  return (
                    <li key={member.userId} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {member.name || "Unnamed user"}
                          {isSelf ? " (you)" : ""}
                        </p>
                        <p className="mt-1 truncate text-xs text-text-secondary">{member.email || "No email"}</p>
                      </div>

                      {editable ? (
                        <select
                          aria-label={`Permission for ${member.name || member.email || "user"}`}
                          value={member.role}
                          disabled={isSelf || savingUserId === member.userId}
                          onChange={(event) => void changeRole(member, event.target.value as PosRole)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary disabled:opacity-60"
                        >
                          {POS_ROLES.map((role) => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
      <BottomNav />
    </section>
  );
};

export default Users;
