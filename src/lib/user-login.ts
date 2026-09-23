export const USERNAME_EMAIL_DOMAIN = "users.taskflow.invalid";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/.test(normalizeUsername(value));
}

export function usernameToEmail(value: string) {
  return `${normalizeUsername(value)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function loginIdentifierToEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("@") ? normalized : usernameToEmail(normalized);
}
