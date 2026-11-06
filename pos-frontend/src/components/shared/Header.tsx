import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { FaUserCircle } from "react-icons/fa";
import { IoLogOut } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { useNavigate } from "react-router-dom";

import logo from "../../assets/images/HarbsLogo.png";
import { setSessionTokens } from "../../https/axiosWrapper";
import { removeUser } from "../../redux/slices/userSlice";
import { ROLE_LABELS, effectiveRole } from "../../utils/roles";

const Header: React.FC = () => {
  const userData = useSelector((state: RootState) => state.user);
  const { logout } = useAuth0();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    setSessionTokens(null);
    dispatch(removeUser());
    logout({ logoutParams: { returnTo: window.location.origin } });
    navigate("/auth");
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4 shadow-sm">
      {/* Logo */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex cursor-pointer items-center gap-3"
      >
        <img
          src={logo}
          alt="HARBS Logo"
          className="h-12 w-auto object-contain"
        />
      </button>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* User */}
        <div className="flex items-center gap-3">
          <FaUserCircle className="text-4xl text-text-secondary" />

          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {userData.name || "Guest"}
            </h2>

            <p className="text-xs text-text-secondary">
              {ROLE_LABELS[effectiveRole(userData.role)]}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 rounded-xl p-2 text-text-secondary transition hover:bg-secondary-light hover:text-primary"
          >
            <IoLogOut size={28} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;