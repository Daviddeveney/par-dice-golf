import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { authenticate } from "@google-cloud/local-auth";
import { JWT, OAuth2Client } from "google-auth-library";

import {
  describeGoogleMarketingConfig,
  getGoogleMarketingConfig,
  requireGoogleMarketingAuthConfig,
} from "./config.mjs";

function readClientSection(credentialsPath) {
  const parsed = JSON.parse(readFileSync(credentialsPath, "utf8"));
  const client = parsed.installed || parsed.web;

  if (!client?.client_id || !client.client_secret) {
    throw new Error(
      `OAuth client file at ${credentialsPath} is missing installed/web client credentials.`,
    );
  }

  return client;
}

function createOAuthClient(credentialsPath) {
  const client = readClientSection(credentialsPath);
  const redirectUri = client.redirect_uris?.[0] || "http://127.0.0.1";

  return new OAuth2Client({
    clientId: client.client_id,
    clientSecret: client.client_secret,
    redirectUri,
  });
}

async function saveToken(config, credentials) {
  await mkdir(dirname(config.tokenPath), { recursive: true });

  let tokenToSave = credentials;
  if (!tokenToSave.refresh_token && existsSync(config.tokenPath)) {
    const prior = JSON.parse(readFileSync(config.tokenPath, "utf8"));
    if (prior.refresh_token) {
      tokenToSave = { ...tokenToSave, refresh_token: prior.refresh_token };
    }
  }

  await writeFile(config.tokenPath, JSON.stringify(tokenToSave, null, 2) + "\n");
}

async function loadSavedClient(config) {
  if (!existsSync(config.tokenPath)) {
    return null;
  }

  const client = createOAuthClient(config.credentialsPath);
  const token = JSON.parse(readFileSync(config.tokenPath, "utf8"));
  client.setCredentials(token);
  return client;
}

function createServiceAccountClient(config) {
  const parsed = JSON.parse(readFileSync(config.serviceAccountPath, "utf8"));
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      `Service account file at ${config.serviceAccountPath} is missing client_email/private_key.`,
    );
  }

  return new JWT({
    email: parsed.client_email,
    key: parsed.private_key,
    scopes: config.scopes,
    subject: config.serviceAccountSubject,
  });
}

export async function getAuthorizedClient(options = {}) {
  const config = requireGoogleMarketingAuthConfig(getGoogleMarketingConfig());

  if (config.authMode === "service-account") {
    return createServiceAccountClient(config);
  }

  if (!options.forceLogin) {
    const saved = await loadSavedClient(config);
    if (saved) {
      return saved;
    }
  }

  mkdirSync(dirname(config.tokenPath), { recursive: true });

  const auth = await authenticate({
    scopes: config.scopes,
    keyfilePath: config.credentialsPath,
  });

  await saveToken(config, auth.credentials);
  return auth;
}

export async function login() {
  const runtimeConfig = getGoogleMarketingConfig();
  const auth = await getAuthorizedClient({
    forceLogin: runtimeConfig.authMode !== "service-account",
  });
  const describedConfig = describeGoogleMarketingConfig();

  return {
    ...describedConfig,
    accessTokenPresent: Boolean((await auth.getAccessToken()).token),
    refreshTokenPresent: Boolean(auth.credentials.refresh_token),
  };
}

export function getAuthStatus() {
  return describeGoogleMarketingConfig();
}

export async function logout() {
  const config = getGoogleMarketingConfig();
  if (config.authMode !== "service-account" && existsSync(config.tokenPath)) {
    await rm(config.tokenPath);
  }

  return describeGoogleMarketingConfig();
}
