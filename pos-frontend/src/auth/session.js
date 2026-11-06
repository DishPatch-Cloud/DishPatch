import { setSessionTokens } from "../https/axiosWrapper";

const STORAGE_KEY = "dishpatch.pos.session";
const listeners = new Set();

export function readPasswordSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.accessToken || !session?.idToken) return null;
    return session;
  } catch {
    return null;
  }
}

export function savePasswordSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: session.accessToken,
    idToken: session.idToken,
  }));
  setSessionTokens(session);
  listeners.forEach((listener) => listener());
}

export function clearPasswordSession() {
  const hadSession = sessionStorage.getItem(STORAGE_KEY) !== null;
  sessionStorage.removeItem(STORAGE_KEY);
  setSessionTokens(null);
  if (hadSession) listeners.forEach((listener) => listener());
}

export function subscribePasswordSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
