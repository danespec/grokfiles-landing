import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8787);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".pdf", "application/pdf"],
]);

const resolvePath = (pathname) => {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidates =
    clean === ""
      ? ["index.html"]
      : [clean, `${clean}.html`, path.join(clean, "index.html")];
  for (const candidate of candidates) {
    const filePath = path.resolve(root, candidate);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) continue;
    return filePath;
  }
  return null;
};

http
  .createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const filePath = resolvePath(url.pathname);
    if (!filePath) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": types.get(path.extname(filePath)) || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}`);
  });
