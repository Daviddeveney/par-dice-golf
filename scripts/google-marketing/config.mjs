import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { loadLocalEnv } from "./env.mjs";

export const DEFAULT_GOOGLE_MARKETING_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/analytics.edit",
  "https://www.googleapis.com/auth/analytics.manage.users.readonly",
  "https://www.googleapis.com/auth/analytics.manage.users",
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  "https://www.googleapis.com/auth/tagmanager.publish",
  "https://www.googleapis.com/auth/tagmanager.manage.users",
  "https://www.googleapis.com/auth/tagmanager.manage.accounts",
];

function normalizeAuthMode(value) {
  const normalized = (value || "oauth").trim().toLowerCase();
  if (
    normalized === "oauth" ||
    normalized === "service-account" ||
    normalized === "auto"
  ) {
    return normalized;
  }

  throw new Error(
    "GOOGLE_MARKETING_AUTH_MODE must be one of: oauth, service-account, auto.",
  );
}

export function getGoogleMarketingConfig() {
  loadLocalEnv();

  const credentialsPath = resolve(
    process.cwd(),
    process.env.GOOGLE_MARKETING_CREDENTIALS_PATH ||
      ".google-marketing/oauth-client.json",
  );
  const tokenPath = resolve(
    process.cwd(),
    process.env.GOOGLE_MARKETING_TOKEN_PATH ||
      ".google-marketing/oauth-token.json",
  );
  const serviceAccountPath = resolve(
    process.cwd(),
    process.env.GOOGLE_MARKETING_SERVICE_ACCOUNT_PATH ||
      ".google-marketing/service-account.json",
  );
  const requestedAuthMode = normalizeAuthMode(
    process.env.GOOGLE_MARKETING_AUTH_MODE || "oauth",
  );
  const effectiveAuthMode =
    requestedAuthMode === "auto"
      ? existsSync(serviceAccountPath)
        ? "service-account"
        : "oauth"
      : requestedAuthMode;
  const scopes = (
    process.env.GOOGLE_MARKETING_SCOPES ||
    DEFAULT_GOOGLE_MARKETING_SCOPES.join(",")
  )
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    authMode: effectiveAuthMode,
    requestedAuthMode,
    credentialsPath,
    tokenPath,
    serviceAccountPath,
    serviceAccountSubject:
      process.env.GOOGLE_MARKETING_SERVICE_ACCOUNT_SUBJECT?.trim() || undefined,
    scopes,
  };
}

export function describeGoogleMarketingConfig() {
  const config = getGoogleMarketingConfig();

  return {
    ...config,
    credentialsPresent: existsSync(config.credentialsPath),
    tokenPresent: existsSync(config.tokenPath),
    serviceAccountPresent: existsSync(config.serviceAccountPath),
  };
}

export function requireGoogleMarketingAuthConfig(config = getGoogleMarketingConfig()) {
  if (config.authMode === "service-account") {
    if (existsSync(config.serviceAccountPath)) {
      return config;
    }

    throw new Error(
      [
        `Missing Google service account key file at ${config.serviceAccountPath}.`,
        "Save the JSON key there or set GOOGLE_MARKETING_SERVICE_ACCOUNT_PATH.",
      ].join(" "),
    );
  }

  if (existsSync(config.credentialsPath)) {
    return config;
  }

  throw new Error(
    [
      `Missing Google OAuth client file at ${config.credentialsPath}.`,
      "Create a Desktop app OAuth client in Google Cloud, download the JSON file,",
      "and save it to that path or set GOOGLE_MARKETING_CREDENTIALS_PATH.",
    ].join(" "),
  );
}
