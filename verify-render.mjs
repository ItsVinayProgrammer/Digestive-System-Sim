import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const appUrl = process.argv[2] ?? "http://127.0.0.1:5173/";
const expectedOrgans = [
  "liver",
  "gallbladder",
  "stomach",
  "pancreas",
  "smallIntestine",
  "largeIntestine",
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeout = 15000) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function openWebSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error(`Could not open ${url}`)), {
      once: true,
    });
  });
}

function createCdp(socket) {
  let id = 1;
  const pending = new Map();
  const events = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      } else {
        resolve(message.result);
      }
      return;
    }

    events.push(message);
  });

  return {
    events,
    send(method, params = {}) {
      const messageId = id++;
      socket.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }

  return result.result.value;
}

async function waitForReady(cdp, timeout = 120000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const state = await evaluate(
      cdp,
      `(() => ({
        ready: window.__SIM_READY__ === true,
        error: window.__SIM_ERROR__ || null,
        state: window.__SIM_API__?.getState?.() || null,
        loadingText: document.querySelector('#loading-state')?.textContent?.trim() || '',
        bodyText: document.body.innerText.slice(0, 300)
      }))()`,
    );

    if (state.error) {
      throw new Error(state.error);
    }
    if (state.ready) {
      return state.state;
    }
    await delay(500);
  }

  throw new Error("Timed out waiting for the simulation readiness flag.");
}

async function waitForState(cdp, predicate, timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const state = await evaluate(cdp, "window.__SIM_API__?.getState?.()");
    if (predicate(state)) {
      return state;
    }
    await delay(100);
  }

  throw new Error("Timed out waiting for expected simulation state.");
}

async function clickOrgan(cdp, organId) {
  const point = await evaluate(cdp, `window.__SIM_API__.getScreenAnchor('${organId}')`);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`No screen anchor for ${organId}`);
  }

  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function capture(cdp, filePath) {
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(filePath, Buffer.from(screenshot.data, "base64"));
}

async function runViewport({ name, width, height, port, actions }) {
  const profile = join(tmpdir(), `digestive-sim-edge-${name}-${Date.now()}`);
  const browser = spawn(edgePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    appUrl,
  ]);

  let stderr = "";
  browser.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const page = pages.find((entry) => entry.type === "page");
    if (!page) {
      throw new Error("No debuggable page target found.");
    }

    const socket = await openWebSocket(page.webSocketDebuggerUrl);
    const cdp = createCdp(socket);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width <= 760,
    });

    const initialState = await waitForReady(cdp);
    const missing = expectedOrgans.filter((id) => !initialState.mappedOrgans.includes(id));
    if (missing.length) {
      throw new Error(`Missing mapped organs: ${missing.join(", ")}`);
    }

    await actions(cdp);
    socket.close();
  } finally {
    browser.kill();
    if (stderr.includes("ERROR") && !stderr.includes("DevTools listening")) {
      console.error(stderr);
    }
  }
}

await runViewport({
  name: "desktop",
  width: 1440,
  height: 900,
  port: 9333,
  actions: async (cdp) => {
    await clickOrgan(cdp, "liver");
    await waitForState(
      cdp,
      (state) =>
        state?.selectedOrgan === "liver" &&
        state?.labelVisible === true &&
        state?.glassOrgans.includes("liver"),
    );
    await capture(cdp, "_verification-desktop.png");

    await evaluate(cdp, "window.__SIM_API__.startQuiz()");
    await waitForState(cdp, (state) => state?.quizActive === true && state?.quizVisible === true);
    await clickOrgan(cdp, "gallbladder");
    await waitForState(cdp, (state) => state?.score === 1 || state?.quizIndex > 0, 2500);
    await capture(cdp, "_verification-quiz.png");
  },
});

await runViewport({
  name: "mobile",
  width: 390,
  height: 844,
  port: 9334,
  actions: async (cdp) => {
    const collapsed = await evaluate(
      cdp,
      "document.querySelector('#side-panel').classList.contains('collapsed')",
    );
    if (!collapsed) {
      throw new Error("Mobile panel did not start collapsed.");
    }
    await capture(cdp, "_verification-mobile.png");
  },
});

console.log("Browser verification passed for desktop, quiz, and mobile states.");
