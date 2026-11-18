const express = require("express");
const dns = require("node:dns").promises;
const net = require("node:net");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_HOSTS = (process.env.PROXY_ALLOWED_HOSTS || "")
  .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);

app.disable("x-powered-by");
app.use(express.static("public", { extensions: ["html"] }));

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  return p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255) ||
    p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
}
function isPrivateIPv6(ip) {
  const s = ip.toLowerCase();
  return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") ||
    s.startsWith("fe80:") || s.startsWith("::ffff:127.") || s.startsWith("::ffff:10.");
}
async function validateTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("Enter a valid full URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (u.username || u.password) throw new Error("URLs containing login credentials are not allowed.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Only standard web ports 80 and 443 are allowed.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Local network destinations are blocked.");
  if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h))) {
    throw new Error("This host is not on the server's PROXY_ALLOWED_HOSTS allowlist.");
  }
  const records = await dns.lookup(host, { all: true });
  if (!records.length || records.some(r => net.isIP(r.address) === 4 ? isPrivateIPv4(r.address) : isPrivateIPv6(r.address))) {
    throw new Error("Private or local network destinations are blocked.");
  }
  return u;
}

app.get("/api/status", (_req, res) => {
  res.json({
    service: "DUDE BROWSER guarded fetch relay",
    connected: true,
    mode: "server-side HTTP(S) fetch",
    allowlistEnabled: ALLOWED_HOSTS.length > 0,
    allowedHostCount: ALLOWED_HOSTS.length,
    note: "This relay does not override school, workplace, website, or network access controls."
  });
});

app.get("/api/proxy", async (req, res) => {
  try {
    const target = await validateTarget(String(req.query.url || ""));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let upstream;
    try {
      upstream = await fetch(target, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "DudeBrowser/1.0 (guarded fetch relay)", "accept": req.headers.accept || "text/html,*/*" }
      });
    } finally { clearTimeout(timer); }

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    if (type.includes("text/html") || type.includes("text/plain") || type.includes("application/json") ||
        type.includes("text/css") || type.startsWith("image/")) {
      const body = Buffer.from(await upstream.arrayBuffer());
      if (body.length > 5 * 1024 * 1024) return res.status(413).send("Response is larger than the 5 MB relay limit.");
      res.status(upstream.status);
      res.set("content-type", type);
      res.set("x-content-type-options", "nosniff");
      res.set("cache-control", "no-store");
      res.send(body);
    } else {
      res.status(415).type("text").send("This content type is not supported by the browser relay.");
    }
  } catch (err) {
    const msg = err.name === "AbortError" ? "The destination took too long to respond." : err.message;
    res.status(400).json({ error: msg || "Unable to fetch this page." });
  }
});

app.get("*", (_req, res) => res.sendFile(require("node:path").join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`DUDE BROWSER running on http://localhost:${PORT}`));