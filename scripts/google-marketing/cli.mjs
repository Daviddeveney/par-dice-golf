#!/usr/bin/env node

import { getAuthStatus, login, logout } from "./auth.mjs";
import * as ga from "./ga.mjs";
import * as gtm from "./gtm.mjs";

function printHelp() {
  console.log(`
Google marketing CLI

Usage:
  npm run google:marketing -- <group> <command> [--flags]

Auth:
  npm run google:marketing -- auth status
  npm run google:marketing -- auth login
  npm run google:marketing -- auth logout

Auth env:
  GOOGLE_MARKETING_AUTH_MODE=oauth|service-account|auto
  GOOGLE_MARKETING_CREDENTIALS_PATH=.google-marketing/oauth-client.json
  GOOGLE_MARKETING_TOKEN_PATH=.google-marketing/oauth-token.json
  GOOGLE_MARKETING_SERVICE_ACCOUNT_PATH=.google-marketing/service-account.json

Tag Manager:
  npm run google:marketing -- gtm accounts
  npm run google:marketing -- gtm lookup-container --tag-id GTM-TZ8W5BK7
  npm run google:marketing -- gtm user-permissions --account 6343067934
  npm run google:marketing -- gtm grant-user --account 6343067934 --email service-account@project.iam.gserviceaccount.com --account-permission admin
  npm run google:marketing -- gtm containers --account 123456
  npm run google:marketing -- gtm create-container --account 123456 --name "ParagonStrideWeb" --domain paragonstride-web.vercel.app
  npm run google:marketing -- gtm workspaces --account 123456 --container 654321
  npm run google:marketing -- gtm workspace-status --account 123456 --container 654321 --workspace 1
  npm run google:marketing -- gtm tags --account 123456 --container 654321 --workspace 1
  npm run google:marketing -- gtm triggers --account 123456 --container 654321 --workspace 1
  npm run google:marketing -- gtm variables --account 123456 --container 654321 --workspace 1
  npm run google:marketing -- gtm gtag-configs --account 123456 --container 654321 --workspace 1
  npm run google:marketing -- gtm version-headers --account 123456 --container 654321
  npm run google:marketing -- gtm live-version --account 123456 --container 654321
  npm run google:marketing -- gtm create-workspace --account 123456 --container 654321 --name "Codex Workspace"
  npm run google:marketing -- gtm create-version --account 123456 --container 654321 --workspace 1 --name "Analytics update"
  npm run google:marketing -- gtm publish-version --account 123456 --container 654321 --version 12
  npm run google:marketing -- gtm repair-roundreserve-ga4 --account 6343067934 --container 245667082 --workspace 6 --measurement-id G-QFLYRLWSQC --dry-run
  npm run google:marketing -- gtm repair-roundreserve-ga4 --account 6343067934 --container 245667082 --workspace 6 --measurement-id G-QFLYRLWSQC --publish

Google Analytics:
  npm run google:marketing -- ga accounts
  npm run google:marketing -- ga account-summaries
  npm run google:marketing -- ga properties
  npm run google:marketing -- ga create-property --account 163290277 --name "ParagonStrideWeb"
  npm run google:marketing -- ga properties --account 386964850
  npm run google:marketing -- ga data-streams --property 123456789
  npm run google:marketing -- ga create-web-stream --property 123456789 --name "ParagonStrideWeb Web" --default-uri https://paragonstride-web.vercel.app
  npm run google:marketing -- ga key-events --property 123456789
  npm run google:marketing -- ga ensure-key-event --property 527625633 --event generate_lead
  npm run google:marketing -- ga access-bindings --parent-type account --parent 386964850
  npm run google:marketing -- ga ensure-access-binding --parent-type account --parent 386964850 --user roundreserve@gmail.com --roles predefinedRoles/admin
  npm run google:marketing -- ga measurement-protocol-secrets --property 123456789 --data-stream 987654321
  npm run google:marketing -- ga report --property 123456789 --days 7 --dimensions eventName,pagePath --metrics eventCount
  npm run google:marketing -- ga realtime --property 123456789 --dimensions eventName --metrics eventCount
`.trim());
}

function parseArgs(argv) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      positionals.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positionals, options };
}

function requireOption(options, name) {
  const value = options[name];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new Error(`Missing required flag --${name}.`);
}

function optionalString(options, name) {
  const value = options[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseCsvOption(options, name, fallback) {
  const raw = optionalString(options, name);
  return raw
    ? raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : fallback;
}

function parseIntegerOption(options, name, fallback) {
  const raw = optionalString(options, name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Flag --${name} must be an integer.`);
  }

  return parsed;
}

function parseParentType(options) {
  const value = requireOption(options, "parent-type");
  if (value !== "account" && value !== "property") {
    throw new Error("Flag --parent-type must be account or property.");
  }

  return value;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function run(parsed) {
  const [group, command] = parsed.positionals;

  if (!group || group === "help" || group === "--help") {
    printHelp();
    return;
  }

  if (group === "auth") {
    switch (command) {
      case "status":
        printJson(getAuthStatus());
        return;
      case "login":
        printJson(await login());
        return;
      case "logout":
        printJson(await logout());
        return;
      default:
        throw new Error(`Unknown auth command: ${command || "(missing)"}.`);
    }
  }

  if (group === "gtm") {
    switch (command) {
      case "accounts":
        printJson(await gtm.listAccounts());
        return;
      case "lookup-container":
        printJson(await gtm.lookupContainerByTagId(requireOption(parsed.options, "tag-id")));
        return;
      case "user-permissions":
        printJson(await gtm.listUserPermissions(requireOption(parsed.options, "account")));
        return;
      case "grant-user":
        printJson(
          await gtm.createUserPermission({
            account: requireOption(parsed.options, "account"),
            email: requireOption(parsed.options, "email"),
            accountPermission:
              optionalString(parsed.options, "account-permission") || "user",
            containerId: optionalString(parsed.options, "container"),
            containerPermission: optionalString(
              parsed.options,
              "container-permission",
            ),
          }),
        );
        return;
      case "containers":
        printJson(await gtm.listContainers(requireOption(parsed.options, "account")));
        return;
      case "create-container":
        printJson(
          await gtm.createContainer({
            account: requireOption(parsed.options, "account"),
            name: requireOption(parsed.options, "name"),
            domainNames: parseCsvOption(parsed.options, "domain", undefined),
            usageContext: parseCsvOption(parsed.options, "usage-context", ["web"]),
            notes: optionalString(parsed.options, "notes"),
          }),
        );
        return;
      case "workspaces":
        printJson(
          await gtm.listWorkspaces(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
          ),
        );
        return;
      case "workspace-status":
        printJson(
          await gtm.getWorkspaceStatus(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
            requireOption(parsed.options, "workspace"),
          ),
        );
        return;
      case "tags":
        printJson(
          await gtm.listTags(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
            requireOption(parsed.options, "workspace"),
          ),
        );
        return;
      case "triggers":
        printJson(
          await gtm.listTriggers(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
            requireOption(parsed.options, "workspace"),
          ),
        );
        return;
      case "variables":
        printJson(
          await gtm.listVariables(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
            requireOption(parsed.options, "workspace"),
          ),
        );
        return;
      case "gtag-configs":
        printJson(
          await gtm.listGtagConfigs(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
            requireOption(parsed.options, "workspace"),
          ),
        );
        return;
      case "version-headers":
        printJson(
          await gtm.listVersionHeaders(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
          ),
        );
        return;
      case "live-version":
        printJson(
          await gtm.getLiveVersion(
            requireOption(parsed.options, "account"),
            requireOption(parsed.options, "container"),
          ),
        );
        return;
      case "create-workspace":
        printJson(
          await gtm.createWorkspace({
            account: requireOption(parsed.options, "account"),
            container: requireOption(parsed.options, "container"),
            name: requireOption(parsed.options, "name"),
            description: optionalString(parsed.options, "description"),
          }),
        );
        return;
      case "create-version":
        printJson(
          await gtm.createVersion({
            account: requireOption(parsed.options, "account"),
            container: requireOption(parsed.options, "container"),
            workspace: requireOption(parsed.options, "workspace"),
            name: optionalString(parsed.options, "name"),
            notes: optionalString(parsed.options, "notes"),
          }),
        );
        return;
      case "publish-version":
        printJson(
          await gtm.publishVersion({
            account: requireOption(parsed.options, "account"),
            container: requireOption(parsed.options, "container"),
            version: requireOption(parsed.options, "version"),
            fingerprint: optionalString(parsed.options, "fingerprint"),
          }),
        );
        return;
      case "repair-roundreserve-ga4":
        printJson(
          await gtm.repairRoundReserveGa4({
            account: requireOption(parsed.options, "account"),
            container: requireOption(parsed.options, "container"),
            workspace: requireOption(parsed.options, "workspace"),
            measurementId: requireOption(parsed.options, "measurement-id"),
            dryRun: Boolean(parsed.options["dry-run"]),
            publish: Boolean(parsed.options.publish),
            versionName:
              optionalString(parsed.options, "version-name") ||
              "Align RoundReserve GA4",
            versionNotes:
              optionalString(parsed.options, "version-notes") ||
              "Retarget GTM GA4 tags to G-QFLYRLWSQC, pause the obsolete manual SPA pageview tag, and add the missing trial_checkout_started event tag.",
          }),
        );
        return;
      default:
        throw new Error(`Unknown GTM command: ${command || "(missing)"}.`);
    }
  }

  if (group === "ga") {
    switch (command) {
      case "accounts":
        printJson(await ga.listAccounts());
        return;
      case "account-summaries":
        printJson(await ga.listAccountSummaries());
        return;
      case "properties":
        printJson(await ga.listProperties(optionalString(parsed.options, "account")));
        return;
      case "create-property":
        printJson(
          await ga.createProperty({
            account: requireOption(parsed.options, "account"),
            displayName: requireOption(parsed.options, "name"),
            timeZone: optionalString(parsed.options, "time-zone") || "America/New_York",
            currencyCode: optionalString(parsed.options, "currency") || "USD",
          }),
        );
        return;
      case "data-streams":
        printJson(await ga.listDataStreams(requireOption(parsed.options, "property")));
        return;
      case "create-web-stream":
        printJson(
          await ga.createWebDataStream({
            property: requireOption(parsed.options, "property"),
            displayName: requireOption(parsed.options, "name"),
            defaultUri: requireOption(parsed.options, "default-uri"),
          }),
        );
        return;
      case "key-events":
        printJson(await ga.listKeyEvents(requireOption(parsed.options, "property")));
        return;
      case "ensure-key-event":
        printJson(
          await ga.ensureKeyEvent({
            property: requireOption(parsed.options, "property"),
            eventName: requireOption(parsed.options, "event"),
            countingMethod:
              optionalString(parsed.options, "counting-method") || "ONCE_PER_EVENT",
          }),
        );
        return;
      case "access-bindings":
        printJson(
          await ga.listAccessBindings({
            parentType: parseParentType(parsed.options),
            parent: requireOption(parsed.options, "parent"),
            pageSize: parseIntegerOption(parsed.options, "page-size", 200),
          }),
        );
        return;
      case "ensure-access-binding":
        printJson(
          await ga.ensureAccessBinding({
            parentType: parseParentType(parsed.options),
            parent: requireOption(parsed.options, "parent"),
            user: requireOption(parsed.options, "user"),
            roles: parseCsvOption(parsed.options, "roles", ["predefinedRoles/admin"]),
          }),
        );
        return;
      case "measurement-protocol-secrets":
        printJson(
          await ga.listMeasurementProtocolSecrets(
            requireOption(parsed.options, "property"),
            requireOption(parsed.options, "data-stream"),
          ),
        );
        return;
      case "report":
        printJson(
          await ga.runReport({
            property: requireOption(parsed.options, "property"),
            days: parseIntegerOption(parsed.options, "days", 7),
            dimensions: parseCsvOption(parsed.options, "dimensions", ["eventName"]),
            metrics: parseCsvOption(parsed.options, "metrics", ["eventCount"]),
            limit: parseIntegerOption(parsed.options, "limit", 50),
          }),
        );
        return;
      case "realtime":
        printJson(
          await ga.runRealtimeReport({
            property: requireOption(parsed.options, "property"),
            dimensions: parseCsvOption(parsed.options, "dimensions", ["eventName"]),
            metrics: parseCsvOption(parsed.options, "metrics", ["eventCount"]),
            limit: parseIntegerOption(parsed.options, "limit", 50),
          }),
        );
        return;
      default:
        throw new Error(`Unknown GA command: ${command || "(missing)"}.`);
    }
  }

  throw new Error(`Unknown command group: ${group}.`);
}

async function main() {
  try {
    await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI failure.";
    console.error(`google:marketing error: ${message}`);
    process.exitCode = 1;
  }
}

await main();
