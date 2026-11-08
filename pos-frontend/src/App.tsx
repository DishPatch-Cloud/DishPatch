import type { ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector } from "react-redux";

import {
  Auth,
  Dashboard,
  Menu,
  MenuEditor,
  Orders,
  Profile,
  Tables,
  Users,
} from "./pages";

import Header from "./components/shared/Header";
import FullScreenLoader from "./components/shared/FullScreenLoader";

import useLoadData from "./hooks/useLoadData";

import type { RootState } from "./redux/store";

interface ProtectedRoutesProps {
  children: ReactNode;
}

const Layout = () => {
  const isLoading = useLoadData();
  const location = useLocation();

  const hideHeaderRoutes = ["/auth"];

  const { isAuth } = useSelector(
    (state: RootState) => state.user
  );

  if (isLoading) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideHeaderRoutes.includes(location.pathname) && (
        <Header />
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <Menu />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/auth"
          element={
            isAuth ? <Navigate to="/" replace /> : <Auth />
          }
        />

        <Route
          path="/menu"
          element={
            <ProtectedRoutes>
              <Menu />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/menu/edit"
          element={
            <ProtectedRoutes>
              <MenuEditor />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoutes>
              <Orders />
            </ProtectedRoutes>
          }
        />

        {/* <Route
          path="/tables"
          element={
            <ProtectedRoutes>
              <Tables />
            </ProtectedRoutes>
          }
        /> */}

        <Route
          path="/profile"
          element={
            <ProtectedRoutes>
              <Profile />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoutes>
              <Users />
            </ProtectedRoutes>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoutes>
              <Dashboard />
            </ProtectedRoutes>
          }
        />

        <Route
          path="*"
          element={<div>Not Found</div>}
        />
      </Routes>
      </div>
    </div>
  );
};

const ProtectedRoutes = ({
  children,
}: ProtectedRoutesProps) => {
  const { isAuth } = useSelector(
    (state: RootState) => state.user
  );

  if (!isAuth) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <Router>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <Layout />
      </div>
    </Router>
  );
};

export default App;