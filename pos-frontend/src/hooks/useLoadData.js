import { useDispatch } from "react-redux";
import { useAuth0 } from "@auth0/auth0-react";
import { getUserData } from "../https";
import { setSessionTokens } from "../https/axiosWrapper";
import { useEffect, useState } from "react";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";

const useLoadData = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: authLoading, isAuthenticated, getAccessTokenSilently, getIdTokenClaims } = useAuth0();
  const [isLoading, setIsLoading] = useState(true);
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!isAuthenticated) {
      setSessionTokens(null);
      dispatch(removeUser());
      setIsLoading(false);
      if (location.pathname !== "/auth") navigate("/auth", { replace: true });
      return;
    }

    (async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: { audience, scope: "openid profile email" },
        });
        const claims = await getIdTokenClaims();
        if (cancelled) return;
        setSessionTokens({ accessToken, idToken: claims?.__raw || "" });
        const { data } = await getUserData();
        if (cancelled) return;
        const { userId, name, email, phone, role } = data.data || data;
        dispatch(setUser({ userId, name, email, phone, role }));
      } catch (error) {
        if (cancelled) return;
        console.log("useLoadData error:", error);
        dispatch(removeUser());
        const message = error.response?.data?.message || "Could not open your POS profile.";
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, getAccessTokenSilently, getIdTokenClaims, audience, dispatch, navigate, location.pathname]);

  return isLoading || authLoading;
};

export default useLoadData;
