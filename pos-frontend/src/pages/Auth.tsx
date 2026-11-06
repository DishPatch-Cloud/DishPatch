import { useEffect, useState, type FormEvent } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";

import restaurant from "../assets/images/harbs-yokohama.jpg";
import logo from "../assets/images/HarbsLogo.png";
import { signInWithPassword, signUpWithPassword } from "../auth0-password";
import { clearPasswordSession, savePasswordSession } from "../auth/session";
import { getUserData } from "../https";
import { setSessionTokens } from "../https/axiosWrapper";
import { setUser } from "../redux/slices/userSlice";

const SOCIAL = [
  { label: "Sign in with Google", connection: "google-oauth2", icon: <GoogleIcon /> },
  { label: "Sign in with GitHub", connection: "github", icon: <GitHubIcon /> },
  { label: "Sign in with Microsoft", connection: "windowslive", icon: <MicrosoftIcon /> },
] as const;

const inputClass = `
  w-full rounded-xl border border-border bg-surface
  px-4 py-4 text-base text-text-primary
  placeholder:text-text-muted
  outline-none transition duration-200
  hover:border-border-strong
  focus:border-primary
  focus:ring-4 focus:ring-primary/10
`;

const Auth = () => {
  const { loginWithRedirect } = useAuth0();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const [signUp, setSignUp] = useState(false);

  useEffect(() => {
    document.title = signUp ? "POS | Sign up" : "POS | Sign in";
  }, [signUp]);

  function socialSignIn(connection: string) {
    void loginWithRedirect({
      authorizationParams: {
        connection,
        audience,
        scope: "openid profile email",
        redirect_uri: window.location.origin,
      },
    });
  }

  async function acceptPassword(session: { accessToken: string; idToken: string }) {
    setSessionTokens(session);
    try {
      const { data } = await getUserData();
      const user = data.data || data;
      savePasswordSession(session);
      dispatch(setUser({
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }));
      navigate("/");
    } catch (error) {
      clearPasswordSession();
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      throw new Error(message || "Could not open your POS profile.");
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-background font-sans">
      <section className="relative hidden min-h-screen w-1/2 overflow-hidden lg:block">
        <img src={restaurant} alt="HARBS Lumine Yokohama restaurant" className="h-full w-full object-cover" />
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">DishPatch POS System</p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-text-primary">
              {signUp ? "Create an account" : "Staff sign in"}
            </h1>
          </header>

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
            <div className="space-y-3">
              {SOCIAL.map((item) => (
                <button
                  key={item.connection}
                  type="button"
                  onClick={() => socialSignIn(item.connection)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-border-strong hover:bg-secondary-light"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <PasswordForm signUp={signUp} onSignedIn={acceptPassword} />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              {signUp ? "Already have an account? " : "New to this POS? "}
              <button
                type="button"
                onClick={() => setSignUp((current) => !current)}
                className="font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {signUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

function PasswordForm({
  signUp,
  onSignedIn,
}: {
  signUp: boolean;
  onSignedIn: (session: { accessToken: string; idToken: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (signUp) await signUpWithPassword(email, password);
      await onSignedIn(await signInWithPassword(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-secondary">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className={inputClass} placeholder="name@company.com" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-secondary">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={8}
          required
          className={inputClass}
          placeholder="At least 8 characters"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-primary px-4 py-4 text-base font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Please wait..." : signUp ? "Sign up" : "Sign in"}
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7C21.7 18.7 23 15.8 23 12.3z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.3A7.2 7.2 0 0 1 4.7 12c0-.8.1-1.6.4-2.3V6.6H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l3.8-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0A12 12 0 0 0 1.3 6.6l3.8 3.1C6.1 7 8.8 4.8 12 4.8z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.9 9.6.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.3 6.9-5.1 6.9-9.6C22 6.6 17.5 2 12 2z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

export default Auth;
