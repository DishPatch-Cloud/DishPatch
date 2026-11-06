import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import restaurant from "../assets/images/harbs-yokohama.jpg";
import logo from "../assets/images/HarbsLogo.png";

const Auth = () => {
  const { loginWithRedirect } = useAuth0();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  useEffect(() => {
    document.title = "POS | Sign in";
  }, []);

  const signIn = (screenHint?: "signup") => {
    void loginWithRedirect({
      authorizationParams: {
        audience,
        scope: "openid profile email",
        redirect_uri: window.location.origin,
        ...(screenHint ? { screen_hint: screenHint } : {}),
      },
    });
  };

  return (
    <main className="flex min-h-screen w-full bg-background font-sans">
      <section className="relative hidden min-h-screen w-1/2 overflow-hidden lg:block">
        <img
          src={restaurant}
          alt="HARBS Lumine Yokohama restaurant"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />
        <blockquote className="absolute bottom-16 left-12 text-white">
          <p className="text-2xl font-semibold">LUMINE YOKOHAMA Store</p>
          <footer className="mt-3 text-lg font-medium text-amber-300">— HARBS Japan</footer>
        </blockquote>
      </section>

      <section className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-10 lg:w-1/2 lg:px-12">
        <div className="w-[460px] max-w-full">
          <header className="mb-8 flex flex-col items-center text-center">
            <img src={logo} alt="HARBS logo" className="mb-4 h-20 w-auto object-contain" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
              DishPatch POS System
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-text-primary">Staff sign in</h1>
          </header>

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
            <p className="text-sm leading-6 text-text-secondary">
              Sign in with DishPatch. The first person to open this location becomes its owner.
              Everyone after that starts as staff, and the owner can change roles.
            </p>
            <button
              type="button"
              onClick={() => signIn()}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-4 text-base font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => signIn("signup")}
              className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-4 text-base font-semibold text-secondary transition hover:border-border-strong hover:bg-secondary-light focus:outline-none focus:ring-4 focus:ring-secondary/10"
            >
              Create an account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
