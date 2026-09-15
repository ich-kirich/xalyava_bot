import http from "http";
import { dispatch, RouterDeps } from "./router";

const MAX_BODY_BYTES = 1024 * 1024;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createHttpServer(deps: RouterDeps): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || "localhost";
      const url = new URL(req.url || "/", `http://${host}`);
      const body = await readBody(req);
      const result = await dispatch(
        {
          method: req.method || "GET",
          pathname: url.pathname,
          searchParams: Object.fromEntries(url.searchParams.entries()),
          headers: req.headers,
          body,
        },
        deps,
      );
      res.writeHead(result.status, { "Content-Type": result.contentType });
      res.end(result.body);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "internal error" }));
    }
  });
}
