import { Buffer } from "node:buffer";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const outputDir = resolve(root, "remotion/captures/played-turn");
const framesDir = resolve(outputDir, "roll-frames");
const port = 4173;
const chromePort = 9223;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profilePath = "/tmp/par-remotion-capture-profile";

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForUrl(url, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting.
    }

    await delay(200);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function connectToPage(url) {
  await waitForUrl(`http://127.0.0.1:${chromePort}/json/version`);

  const response = await fetch(
    `http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" },
  );

  if (!response.ok) {
    throw new Error(`Unable to create Chrome target: ${response.status}`);
  }

  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });

  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }

    const { resolveMessage, rejectMessage } = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) {
      rejectMessage(new Error(message.error.message));
    } else {
      resolveMessage(message.result);
    }
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;

    const promise = new Promise((resolveMessage, rejectMessage) => {
      pending.set(id, { resolveMessage, rejectMessage });
    });

    socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  return {
    send,
    close: () => socket.close(),
  };
}

async function screenshot(page, name) {
  const result = await page.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  const filePath = resolve(outputDir, `${name}.png`);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  return filePath;
}

async function capturePng(page) {
  const result = await page.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  return Buffer.from(result.data, "base64");
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result?.value;
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, options);
    let stderr = "";

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(`${command} exited ${code}\n${stderr}`));
      }
    });
  });
}

async function captureRollAnimation(page) {
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const captureCount = 84;
  const intervalMs = 40;
  const frames = [];

  const captureLoop = (async () => {
    for (let index = 0; index < captureCount; index += 1) {
      const frame = await capturePng(page);
      const frameName = `frame-${String(index).padStart(4, "0")}.png`;
      const framePath = resolve(framesDir, frameName);
      frames.push(framePath);
      await writeFile(framePath, frame);
      await delay(intervalMs);
    }
  })();

  await delay(120);
  await evaluate(page, `document.querySelector("#roll-button")?.click()`);
  await captureLoop;

  await run(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "25",
      "-i",
      resolve(framesDir, "frame-%04d.png"),
      "-vf",
      "scale=1440:1200:flags=lanczos",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      resolve(outputDir, "roll-animation.mp4"),
    ],
    { cwd: root, stdio: "ignore" },
  );

  return frames.length;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await rm(profilePath, { recursive: true, force: true });

  const server = spawn("python3", ["-m", "http.server", String(port)], {
    cwd: root,
    stdio: "ignore",
  });

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${chromePort}`,
      `--user-data-dir=${profilePath}`,
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    {
      stdio: "ignore",
    },
  );

  let page;

  try {
    await waitForUrl(`http://127.0.0.1:${port}/`);
    page = await connectToPage(`http://127.0.0.1:${port}/`);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    await delay(2400);

    await screenshot(page, "01-ready");

    const rollFrameCount = await captureRollAnimation(page);
    await delay(600);

    const rollState = await evaluate(
      page,
      `(() => ({
        dice: Array.from(document.querySelectorAll("[data-index]"))
          .map((die) => die.getAttribute("aria-label") || die.textContent.trim())
          .filter(Boolean),
        score: document.querySelector("#score-preview-value")?.textContent?.trim() || "",
        scoreLabel: document.querySelector("#score-preview-label")?.textContent?.trim() || "",
        hole: document.querySelector("#hole-counter")?.textContent?.trim() || "",
        par: document.querySelector("#par-counter")?.textContent?.trim() || ""
      }))()`,
    );

    await screenshot(page, "02-rolled");

    await evaluate(page, `document.querySelector("#score-button")?.click()`);
    await delay(1200);

    const postedState = await evaluate(
      page,
      `(() => ({
        firstScore: document.querySelector("#tee-sheet-body tr:first-child td:nth-child(3)")?.textContent?.trim() || "",
        total: document.querySelector("#score-total")?.textContent?.trim() || "",
        liveFeed: document.querySelector("#result-banner")?.textContent?.trim() || ""
      }))()`,
    );

    await screenshot(page, "03-posted");

    await writeFile(
      resolve(outputDir, "metadata.json"),
      JSON.stringify(
        {
          rollState,
          postedState,
          rollFrameCount,
          rollAnimation: "roll-animation.mp4",
          capturedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    page?.close();
    chrome.kill("SIGTERM");
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
