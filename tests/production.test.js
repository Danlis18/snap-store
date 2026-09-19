import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
test("production serves built assets, protects cookies and never exposes development login codes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "snap-production-"));
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "0",
      DATA_DIR: dir,
      APP_URL: "https://snap.example",
      SESSION_SECRET: "production-test-only-".repeat(3),
      DEV_AUTH: "true",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stderr.on("data", (x) => {
    logs += x;
  });
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error(logs)), 10000);
      child.stdout.on("data", (x) => {
        const m = String(x).match(/port (\d+)/);
        if (m) {
          clearTimeout(timeout);
          resolve(m[1]);
        }
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(Error("Unexpected exit " + code + logs));
      });
    });
    const origin = "http://127.0.0.1:" + port;
    const boot = await fetch(origin + "/api/bootstrap");
    const data = await boot.json();
    const cookie = boot.headers.get("set-cookie");
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.equal(data.settings.devAuth, false);
    const login = await fetch(origin + "/api/auth/request", {
      method: "POST",
      headers: {
        cookie: cookie.split(";")[0],
        "x-csrf-token": data.csrf,
        "Content-Type": "application/json",
        Origin: "https://snap.example",
      },
      body: JSON.stringify({ email: "nobody@snap.test" }),
    });
    assert.equal(login.status, 503);
    assert.ok(!(await login.text()).includes("devCode"));
    const page = await fetch(origin + "/");
    assert.equal(page.status, 200);
    const html = await page.text();
    const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)[1];
    const js = await fetch(origin + asset);
    assert.equal(js.status, 200);
    assert.match(js.headers.get("content-type"), /javascript/);
    const csp = page.headers.get("content-security-policy");
    assert.match(csp, /frame-ancestors 'none'/);
    assert.ok(!csp.match(/script-src[^;]*'unsafe-inline'/));
    assert.match(html, /https:\/\/snap.example\//);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    await rm(dir, { recursive: true, force: true });
  }
});
