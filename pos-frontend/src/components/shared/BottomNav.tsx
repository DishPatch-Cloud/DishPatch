import React from "react";
import { MdOutlineReorder } from "react-icons/md";
import { CiUser } from "react-icons/ci";
import { BiSolidDish } from "react-icons/bi";
import { FiUsers } from "react-icons/fi";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import type { RootState } from "../../redux/store";
import { canViewRestaurant } from "../../utils/roles";

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useSelector((state: RootState) => state.user.role);
  const showUsers = canViewRestaurant(role);

  const isActive = (path: string): boolean => location.pathname === path;

  const navItemClass = (active: boolean): string =>
    `flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${
      active
        ? "bg-primary-light text-primary"
        : "text-text-secondary hover:bg-secondary-light hover:text-text-primary"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface shadow-[0_-2px_12px_rgba(15,23,42,0.05)]">
      <div className={`grid h-20 items-center gap-2 px-2 sm:px-4 ${showUsers ? "grid-cols-4" : "grid-cols-3"}`}>
        <button
          type="button"
          onClick={() => navigate("/menu")}
          className={navItemClass(isActive("/menu"))}
        >
          <BiSolidDish size={22} />
          <span className="text-xs font-medium">Menu</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/orders")}
          className={navItemClass(isActive("/orders"))}
        >
          <MdOutlineReorder size={22} />
          <span className="text-xs font-medium">Orders</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className={navItemClass(isActive("/profile"))}
        >
          <CiUser size={24} />
          <span className="text-xs font-medium">Profile</span>
        </button>

        {showUsers && (
          <button
            type="button"
            onClick={() => navigate("/users")}
            className={navItemClass(isActive("/users"))}
          >
            <FiUsers size={22} />
            <span className="text-xs font-medium">Users</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;