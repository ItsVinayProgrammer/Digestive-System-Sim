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
const quizAnswers = [
  "gallbladder",
  "stomach",
  "liver",
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
  let lastState = null;

  while (Date.now() - start < timeout) {
    const state = await evaluate(cdp, "window.__SIM_API__?.getState?.()");
    lastState = state;
    if (predicate(state)) {
      return state;
    }
    await delay(100);
  }

  throw new Error(`Timed out waiting for expected simulation state: ${JSON.stringify(lastState)}`);
}

async function clickOrgan(cdp, organId) {
  const point = await evaluate(cdp, `window.__SIM_API__.getScreenAnchor('${organId}')`);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`No screen anchor for ${organId}`);
  }

  await clickPoint(cdp, point.x, point.y);
}

async function clickPoint(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "none",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
}

async function clickSelector(cdp, selector) {
  const rect = await evaluate(
    cdp,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    })()`,
  );
  if (!rect) {
    throw new Error(`Selector not found: ${selector}`);
  }
  await clickPoint(cdp, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

async function pressEscape(cdp) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
}

async function dragCanvas(cdp, startX, startY, endX, endY) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: startX,
    y: startY,
    button: "none",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: startX,
    y: startY,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: startX + (endX - startX) * 0.5,
    y: startY + (endY - startY) * 0.5,
    button: "left",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: endX,
    y: endY,
    button: "left",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: endX,
    y: endY,
    button: "left",
    clickCount: 1,
  });
}

async function dragLabelTag(cdp, tagOrganId, targetOrganId = tagOrganId) {
  const tagRect = await evaluate(cdp, `window.__SIM_API__.getTagRect('${tagOrganId}')`);
  const point = await evaluate(cdp, `window.__SIM_API__.getScreenAnchor('${targetOrganId}')`);
  if (!tagRect || !point) {
    throw new Error(`Cannot drag ${tagOrganId} to ${targetOrganId}`);
  }

  const startX = tagRect.centerX;
  const startY = tagRect.centerY;
  const midX = startX + (point.x - startX) * 0.55;
  const midY = startY + (point.y - startY) * 0.55;

  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: startX,
    y: startY,
    button: "none",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: startX,
    y: startY,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: midX,
    y: midY,
    button: "left",
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "left",
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
    const leaderBefore = await evaluate(
      cdp,
      `(() => {
        const line = document.querySelector('#leader-line');
        return { x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')) };
      })()`,
    );
    await evaluate(cdp, "window.__SIM_API__.rotateCameraForTest(0.22)");
    await delay(400);
    const leaderAfter = await evaluate(
      cdp,
      `(() => {
        const line = document.querySelector('#leader-line');
        return { x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')) };
      })()`,
    );
    if (
      !Number.isFinite(leaderAfter.x1) ||
      Math.hypot(leaderAfter.x1 - leaderBefore.x1, leaderAfter.y1 - leaderBefore.y1) < 1
    ) {
      throw new Error("Leader line did not update during camera rotation.");
    }

    await clickSelector(cdp, "#label-speak");
    await waitForState(
      cdp,
      (state) =>
        state?.lastSpoken ===
          "Liver. Largest gland. Secretes bile juice for the emulsification of fats." &&
        (state?.lastAudioMode === "html5" || state?.currentAudioSrc.includes("liver.wav")),
    );
    await capture(cdp, "_verification-desktop.png");

    await clickPoint(cdp, 48, 840);
    await waitForState(
      cdp,
      (state) => state?.selectedOrgan === null && state?.labelVisible === false,
    );

    await clickOrgan(cdp, "stomach");
    await waitForState(
      cdp,
      (state) => state?.selectedOrgan === "stomach" && state?.glassOrgans.includes("stomach"),
    );
    await pressEscape(cdp);
    await waitForState(
      cdp,
      (state) =>
        state?.selectedOrgan === null &&
        state?.labelVisible === false &&
        state?.glassOrgans.length === 0,
    );

    await evaluate(cdp, "window.__SIM_API__.startQuiz()");
    await waitForState(cdp, (state) => state?.quizActive === true && state?.quizVisible === true);
    for (const [index, answer] of quizAnswers.entries()) {
      await waitForState(cdp, (state) => state?.quizLocked === false);
      await clickOrgan(cdp, answer);
      if (index === quizAnswers.length - 1) {
        await waitForState(
          cdp,
          (state) =>
            state?.scorecardVisible === true &&
            state?.roundComplete === true &&
            state?.score === quizAnswers.length,
          4000,
        );
      } else {
        await waitForState(
          cdp,
          (state) => state?.quizIndex === index + 1 && state?.quizLocked === false,
          4000,
        );
      }
    }
    await capture(cdp, "_verification-scorecard.png");

    await evaluate(cdp, "document.querySelector('#retry-quiz').click()");
    await waitForState(
      cdp,
      (state) =>
        state?.quizActive === true &&
        state?.quizVisible === true &&
        state?.scorecardVisible === false &&
        state?.score === 0 &&
        state?.quizIndex === 0,
    );

    await evaluate(cdp, "window.__SIM_API__.stopQuiz(); window.__SIM_API__.startLabelGame()");
    await waitForState(
      cdp,
      (state) =>
        state?.labelGameActive === true &&
        state?.labelVisible === false &&
        state?.glassOrgans.includes("liver") &&
        state?.glassOrgans.includes("stomach"),
    );
    await dragLabelTag(cdp, "liver", "smallIntestine");
    await waitForState(
      cdp,
      (state) =>
        state?.labelGameActive === true &&
        !state?.placedLabels.includes("liver") &&
        state?.labelGameFeedback.includes("Try again"),
    );
    await dragLabelTag(cdp, "largeIntestine");
    await waitForState(
      cdp,
      (state) => state?.placedLabels.includes("largeIntestine"),
      4000,
    );
    await capture(cdp, "_verification-label-game.png");
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
    const panelRect = await evaluate(
      cdp,
      `(() => {
        const rect = document.querySelector('#side-panel').getBoundingClientRect();
        return { top: rect.top, right: innerWidth - rect.right, width: rect.width, height: rect.height };
      })()`,
    );
    if (panelRect.top > 14 || panelRect.right > 14 || panelRect.width > 54 || panelRect.height > 54) {
      throw new Error(`Mobile menu button is too large or not in the top corner: ${JSON.stringify(panelRect)}`);
    }

    await evaluate(cdp, "window.__SIM_API__.selectOrgan('largeIntestine')");
    await waitForState(
      cdp,
      (state) => state?.selectedOrgan === "largeIntestine" && state?.labelVisible === true,
    );
    const mobileLabel = await evaluate(
      cdp,
      `(() => {
        const rect = document.querySelector('#organ-label').getBoundingClientRect();
        const line = document.querySelector('#leader-line');
        return {
          top: rect.top,
          bottom: innerHeight - rect.bottom,
          height: rect.height,
          maxAllowed: innerHeight * 0.25,
          lineVisible: getComputedStyle(document.querySelector('#leader-layer')).display !== 'none',
          x1: Number(line.getAttribute('x1')),
          y1: Number(line.getAttribute('y1'))
        };
      })()`,
    );
    if (
      mobileLabel.height > mobileLabel.maxAllowed + 1 ||
      mobileLabel.bottom > 16 ||
      !mobileLabel.lineVisible ||
      !Number.isFinite(mobileLabel.x1)
    ) {
      throw new Error(`Mobile label layout failed: ${JSON.stringify(mobileLabel)}`);
    }
    await capture(cdp, "_verification-mobile.png");
  },
});

console.log("Browser verification passed for speech, scorecard, labeling game, and mobile states.");
