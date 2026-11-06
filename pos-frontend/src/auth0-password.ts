const REALM = "Username-Password-Authentication";

export async function signInWithPassword(email: string, password: string): Promise<{ accessToken: string; idToken: string }> {
  const audience = requiredAudience();
  const response = await fetch(`https://${requiredDomain()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: email,
      password,
      client_id: requiredClientId(),
      realm: REALM,
      audience,
      scope: "openid profile email",
    }),
  });
  const payload = (await response.json()) as { access_token?: string; id_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token || !payload.id_token) {
    throw new Error(passwordError(payload));
  }
  return { accessToken: payload.access_token, idToken: payload.id_token };
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const response = await fetch(`https://${requiredDomain()}/dbconnections/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: requiredClientId(),
      email,
      password,
      connection: REALM,
    }),
  });
  if (response.ok) return;
  const payload = (await response.json().catch(() => ({}))) as {
    description?: unknown;
    message?: unknown;
    error?: unknown;
    policy?: unknown;
  };
  throw new Error(signupError(payload));
}

function signupError(payload: { description?: unknown; message?: unknown; error?: unknown; policy?: unknown }): string {
  const description = text(payload.description);
  if (description) return description;
  const failedRules = passwordRules(payload.description);
  const policy = text(payload.policy);
  if (failedRules.length > 0) return `Password is too weak. ${failedRules.join(" ")}`;
  if (policy) return policy;
  return text(payload.message) || text(payload.error) || "Could not create the account.";
}

function passwordRules(description: unknown): string[] {
  if (!description || typeof description !== "object" || !("rules" in description)) return [];
  const rules = (description as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((rule) => {
    if (!rule || typeof rule !== "object") return [];
    const item = rule as { message?: unknown; verified?: unknown; format?: unknown };
    if (item.verified !== false || typeof item.message !== "string") return [];
    return [applyFormat(item.message, item.format)];
  });
}

function applyFormat(message: string, format: unknown): string {
  if (!Array.isArray(format)) return message;
  let index = 0;
  return message.replace(/%d/g, () => String(format[index++] ?? ""));
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function passwordError(payload: { error?: string; error_description?: string }): string {
  if (payload.error === "unauthorized_client" || /grant type/i.test(payload.error_description ?? "")) {
    return "In Auth0, open the DishPatch POS application, then Settings, Advanced Settings, Grant Types, and turn on Password.";
  }
  return payload.error_description || "Could not sign in.";
}

function requiredDomain(): string {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  if (!domain) throw new Error("Auth0 domain is not configured.");
  return domain;
}

function requiredAudience(): string {
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  if (!audience) throw new Error("Auth0 audience is not configured.");
  return audience;
}

function requiredClientId(): string {
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  if (!clientId) throw new Error("Auth0 client id is not configured.");
  return clientId;
}
