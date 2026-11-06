import { useDispatch } from "react-redux";
import { useAuth0 } from "@auth0/auth0-react";
import { getUserData } from "../https";
import { setSessionTokens } from "../https/axiosWrapper";
import { useEffect, useState } from "react";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { clearPasswordSession, readPasswordSession, subscribePasswordSession } from "../auth/session";

const useLoadData = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: authLoading, isAuthenticated, getAccessTokenSilently, getIdTokenClaims } = useAuth0();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTick, setSessionTick] = useState(0);
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  useEffect(() => subscribePasswordSession(() => setSessionTick((current) => current + 1)), []);

  useEffect(() => {
    const saved = readPasswordSession();
    if (!saved && authLoading) return;
    let cancelled = false;

    const openProfile = async (tokens) => {
      setSessionTokens(tokens);
      const { data } = await getUserData();
      if (cancelled) return;
      const { userId, name, email, phone, role } = data.data || data;
      dispatch(setUser({ userId, name, email, phone, role }));
    };

    const fail = (error) => {
      if (cancelled) return;
      cancelled = true;
      console.log("useLoadData error:", error);
      clearPasswordSession();
      dispatch(removeUser());
      const message = error.response?.data?.message || "Could not open your POS profile.";
      enqueueSnackbar(message, { variant: "error" });
      if (location.pathname !== "/auth") navigate("/auth", { replace: true });
    };

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
      const accessToken = await getAccessTokenSilently({
        authorizationParams: { audience, scope: "openid profile email" },
      });
      const claims = await getIdTokenClaims();
      if (cancelled) return;
      await openProfile({ accessToken, idToken: claims?.__raw || "" });
    })().catch(fail).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, getAccessTokenSilently, getIdTokenClaims, audience, dispatch, navigate, location.pathname, sessionTick]);

  return isLoading || (authLoading && !readPasswordSession());
};

export default useLoadData;
