import { useDispatch } from "react-redux";
import { useAuth0 } from "@auth0/auth0-react";
import { getUserData } from "../https";
import { setSessionTokens } from "../https/axiosWrapper";
import { useEffect, useRef, useState } from "react";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { clearPasswordSession, readPasswordSession, subscribePasswordSession } from "../auth/session";

// Auth0 access tokens often outlive the ID token stored beside them. Reject a token
// that is missing, malformed, or inside 30 seconds of expiry.
function tokenUsable(token) {
  if (typeof token !== "string") return false;
  const part = token.split(".")[1];
  if (!part) return false;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

function sessionExpired(error) {
  const status = error?.response?.status;
  return status === 401
    || error?.error === "login_required"
    || error?.error === "missing_refresh_token"
    || error?.error === "invalid_grant";
}

const useLoadData = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: authLoading, isAuthenticated, getAccessTokenSilently, logout } = useAuth0();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTick, setSessionTick] = useState(0);
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const rejected = useRef(false);
  const wasAuthenticated = useRef(false);

  useEffect(() => subscribePasswordSession(() => setSessionTick((current) => current + 1)), []);

  useEffect(() => {
    const saved = readPasswordSession();
    if (!saved && authLoading) return;

    // A new Auth0 sign-in (including one that replaces a rejected cache) may try again.
    if (isAuthenticated && !wasAuthenticated.current) rejected.current = false;
    wasAuthenticated.current = isAuthenticated;

    let cancelled = false;

    const openProfile = async (tokens) => {
      setSessionTokens(tokens);
      const { data } = await getUserData();
      if (cancelled) return;
      rejected.current = false;
      const { userId, name, email, phone, role } = data.data || data;
      dispatch(setUser({ userId, name, email, phone, role }));
    };

    const fail = (error) => {
      if (cancelled) return;
      // Stop the loader here. This same flag tells the finally block to ignore a stale request,
      // so leaving the loader to that block keeps the spinner up after a 401.
      setIsLoading(false);
      cancelled = true;
      rejected.current = true;
      console.log("useLoadData error:", error);
      clearPasswordSession();
      dispatch(removeUser());
      if (sessionExpired(error) && isAuthenticated) void logout({ openUrl: false });
      const message = sessionExpired(error)
        ? "Your sign-in expired. Please sign in again."
        : (error.response?.data?.message || "Could not open your POS profile.");
      enqueueSnackbar(message, { variant: "error" });
      if (location.pathname !== "/auth") navigate("/auth", { replace: true });
    };

    if (saved && (!tokenUsable(saved.accessToken) || !tokenUsable(saved.idToken))) {
      clearPasswordSession();
      return;
    }

    // The saved Auth0 session was already rejected. Wait until it is cleared instead of
    // calling /api/user again on every render.
    if (rejected.current && !saved && isAuthenticated) {
      setSessionTokens(null);
      dispatch(removeUser());
      setIsLoading(false);
      if (location.pathname !== "/auth") navigate("/auth", { replace: true });
      return;
    }

    if (saved) {
      openProfile(saved).catch(fail).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated) {
      setSessionTokens(null);
      dispatch(removeUser());
      setIsLoading(false);
      if (location.pathname !== "/auth") navigate("/auth", { replace: true });
      return;
    }

    (async () => {
      const authorizationParams = { audience, scope: "openid profile email" };
      let tokens = await getAccessTokenSilently({ authorizationParams, detailedResponse: true });
      if (!tokenUsable(tokens?.access_token) || !tokenUsable(tokens?.id_token)) {
        tokens = await getAccessTokenSilently({
          authorizationParams,
          cacheMode: "off",
          detailedResponse: true,
        });
      }
      if (cancelled) return;
      await openProfile({ accessToken: tokens.access_token, idToken: tokens.id_token || "" });
    })().catch(fail).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, getAccessTokenSilently, logout, audience, dispatch, navigate, location.pathname, sessionTick]);

  return isLoading || (authLoading && !readPasswordSession());
};

export default useLoadData;
