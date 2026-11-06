// Auth0 settings for the POS. These identify the POS application, not the provisioner application.
function auth0Config() {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  if (!domain || !audience || !clientId) return null;
  return { domain, audience, clientId };
}

module.exports = { auth0Config };
