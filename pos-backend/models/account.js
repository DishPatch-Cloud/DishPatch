const DEFAULT_ACCOUNT_ID = "acct_default";
const ACCOUNT_ID = /^acct_[a-z0-9-]{1,80}$/;

function accountIdOf(user) {
  const accountId = typeof user?.accountId === "string" ? user.accountId.trim() : "";
  return ACCOUNT_ID.test(accountId) ? accountId : DEFAULT_ACCOUNT_ID;
}

function validAccountId(value) {
  return typeof value === "string" && ACCOUNT_ID.test(value.trim());
}

module.exports = {
  DEFAULT_ACCOUNT_ID,
  accountIdOf,
  validAccountId,
};
