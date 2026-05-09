import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_FILES = [".env", ".env.local"];

let loaded = false;

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length)
    : trimmed;
  const separatorIndex = normalized.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  const value = normalized
    .slice(separatorIndex + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!key) {
    return null;
  }

  return [key, value];
}

export function loadLocalEnv() {
  if (loaded) {
    return;
  }

  for (const fileName of ENV_FILES) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) {
        continue;
      }

      const [key, value] = entry;
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  loaded = true;
}
