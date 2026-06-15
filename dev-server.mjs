import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const startPort = Number(process.env.PORT ?? 5173);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".wav", "audio/wav"],
]);

function isInsideRoot(filePath) {
  const resolvedRoot = root.endsWith(sep) ? root : `${root}${sep}`;
  return filePath === root || filePath.startsWith(resolvedRoot);
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = resolve(root, relativePath);

  if (!isInsideRoot(filePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
      "Content-Length": fileStat.size,
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function listenOnAvailablePort(port) {
  const server = createServer(handleRequest);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) {
      listenOnAvailablePort(port + 1);
      return;
    }

    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Digestive system sim running at http://127.0.0.1:${port}/`);
  });
}

listenOnAvailablePort(startPort);
