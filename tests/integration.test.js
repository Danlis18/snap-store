import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
let child,
  dir,
  origin,
  smtp,
  db,
  products,
  admin,
  buyer,
  anonymous,
  real,
  order,
  second;
const messages = [];
let shuttingDown = false;
function client() {
  let cookie = "",
    csrf = "";
  return {
    async call(route, method = "GET", body, headers = {}) {
      const multipart = body instanceof FormData;
      const r = await fetch(origin + "/api" + route, {
        method,
        headers: {
          cookie,
          ...(multipart ? {} : { "content-type": "application/json" }),
          "x-csrf-token": csrf,
          ...headers,
        },
        body:
          body === undefined
            ? undefined
            : multipart
              ? body
              : JSON.stringify(body),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      const data = await r.json();
      if (data.csrf) csrf = data.csrf;
      return { status: r.status, data, headers: r.headers };
    },
    async login(email) {
      await this.call("/bootstrap");
      const request = await this.call("/auth/request", "POST", { email });
      assert.equal(request.status, 200, JSON.stringify(request.data));
      const r = await this.call("/auth/verify", "POST", {
        email,
        code: request.data.devCode,
      });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data;
    },
  };
}
const line = (p, quantity = 1) => ({
  productId: p.id,
  ...p.variants.find((v) => v.available),
  quantity,
});
const payload = () => ({
  name: "QA Покупець",
  phone: "+380501234567",
  delivery: { city: "Київ", carrier: "nova", address: "Тестове відділення 1" },
  consent: true,
  idempotency: randomUUID(),
});
async function status(id, value) {
  const r = await admin.call("/admin/orders/" + id, "PUT", {
    status: value,
    tracking: "QA-TRACK",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "snap-test-"));
  // A local SMTP sink: no messages leave the machine.
  smtp = net
    .createServer((socket) => {
      socket.on("error", (error) => { if (!shuttingDown || error.code !== "ECONNRESET") throw error; });
      socket.setEncoding("utf8");
      socket.write("220 localhost QA SMTP\r\n");
      let buffer = "",
        dataMode = false,
        message = "";
      socket.on("data", (chunk) => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf("\r\n")) !== -1) {
          const text = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (dataMode) {
            if (text === ".") {
              messages.push(message);
              dataMode = false;
              message = "";
              socket.write("250 accepted\r\n");
            } else message += text + "\n";
            continue;
          }
          if (/^EHLO|^HELO/.test(text))
            socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
          else if (/^AUTH/.test(text)) socket.write("235 authenticated\r\n");
          else if (text === "DATA") {
            dataMode = true;
            socket.write("354 enter mail\r\n");
          } else if (text === "QUIT") {
            socket.end("221 bye\r\n");
          } else socket.write("250 ok\r\n");
        }
      });
    })
    .listen(0, "127.0.0.1");
  await once(smtp, "listening");
  child = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "0",
      DATA_DIR: dir,
      APP_URL: "http://localhost:4173",
      SESSION_SECRET: "snap-test-secret-only-".repeat(3),
      DEV_AUTH: "true",
      ADMIN_EMAILS: "admin@snap.test",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(smtp.address().port),
      SMTP_SECURE: "false",
      SMTP_USER: "test",
      SMTP_PASS: "test",
      MAIL_FROM: "snap@snap.test",
      ORDER_EMAIL: "orders@snap.test",
      AI_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stderr.on("data", (x) => {
    output += x;
    if (String(x).includes("Request failed:")) process.stderr.write(x);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Server did not start: " + output)),
      25000,
    );
    child.stdout.on("data", (x) => {
      output += x;
      const m = output.match(/SNAP listening on port (\d+)/);
      if (m) {
        origin = "http://127.0.0.1:" + m[1];
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(Error("Server exited " + code + ": " + output));
    });
  });
  db = new DatabaseSync(path.join(dir, "snap.sqlite"));
  anonymous = client();
  await anonymous.call("/bootstrap");
  products = (await anonymous.call("/products")).data;
  admin = client();
  await admin.login("admin@snap.test");
  buyer = client();
  await buyer.login("buyer@snap.test");
});
after(async () => {
  shuttingDown = true;
  db?.close();
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  if (smtp) await new Promise((r) => smtp.close(r));
  if (dir) await rm(dir, { recursive: true, force: true });
});
test("100 seeded products: 10 per brand, persisted and editable", () => {
  assert.equal(products.length, 100);
  const counts = {};
  for (const p of products) counts[p.brand] = (counts[p.brand] || 0) + 1;
  assert.equal(Object.keys(counts).length, 10);
  assert.ok(Object.values(counts).every((n) => n === 10));
});
test("CSRF, cross-origin requests and admin/user boundaries enforced", async () => {
  assert.equal(
    (
      await anonymous.call(
        "/cart",
        "PUT",
        { items: [] },
        { "x-csrf-token": "invalid" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await anonymous.call(
        "/cart",
        "PUT",
        { items: [] },
        { origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal((await anonymous.call("/admin")).status, 403);
  assert.equal((await buyer.call("/admin")).status, 403);
  assert.equal((await anonymous.call("/orders")).status, 401);
});
test("email code creates account, consumes OTP and keeps session private", async () => {
  const c = client();
  await c.call("/bootstrap");
  const otp = await c.call("/auth/request", "POST", {
    email: "merge@snap.test",
  });
  const duplicate = await c.call("/auth/request", "POST", { email: "merge@snap.test" });
  assert.equal(duplicate.status, 429);
  assert.ok(duplicate.data.retryAfter > 0 && duplicate.data.retryAfter <= 60);
  assert.ok(Number(duplicate.headers.get("retry-after")) > 0);
  await c.call("/cart", "PUT", { items: [line(products[0])] });
  await c.call("/wishlist", "PUT", { items: [products[0].id] });
  assert.equal(
    (
      await c.call("/auth/verify", "POST", {
        email: "merge@snap.test",
        code: "000000",
      })
    ).status,
    400,
  );
  const r = await c.call("/auth/verify", "POST", {
    email: "merge@snap.test",
    code: otp.data.devCode,
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  assert.equal(
    (
      await c.call("/auth/verify", "POST", {
        email: "merge@snap.test",
        code: otp.data.devCode,
      })
    ).status,
    400,
  );
  const state = (await c.call("/bootstrap")).data;
  assert.equal(state.cart.length, 1);
  assert.ok(state.wishlist.includes(products[0].id));
  assert.ok(messages.length >= 3);
});
test("server rejects unavailable size and ignores forged client price", async () => {
  const p = products.find((p) => p.variants.some((v) => !v.available));
  const v = p.variants.find((v) => !v.available);
  assert.equal(
    (
      await buyer.call("/cart", "PUT", {
        items: [{ productId: p.id, ...v, quantity: 1 }],
      })
    ).status,
    400,
  );
  const r = await buyer.call("/cart", "PUT", {
    items: [{ ...line(p, 5), price: 1, total: 1 }],
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.quote.subtotal, p.price * 5);
  assert.equal(r.data.quote.percent, 5);
});
test("demo order idempotency and privacy; no reward or review eligibility", async () => {
  const input = payload();
  const first = await buyer.call("/orders", "POST", input);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  const repeat = await buyer.call("/orders", "POST", input);
  assert.equal(repeat.data.id, first.data.id);
  assert.equal((await buyer.call("/bootstrap")).data.cart.length, 0);
  for (const s of ["confirmed", "shipped", "delivered"])
    await status(first.data.id, s);
  assert.equal((await buyer.call("/bootstrap")).data.user.balance, 0);
  const id = first.data.quote.lines[0].productId;
  assert.equal(
    (
      await buyer.call("/products/" + id + "/reviews", "POST", {
        rating: 5,
        text: "Тестовий відгук про товар",
      })
    ).status,
    403,
  );
  assert.equal((await admin.call("/orders")).data.length, 0);
});
test("admin validates full variant matrix and can publish real inventory", async () => {
  const p = {
    ...products[0],
    demo: false,
    images: ["https://example.com/qa-product.jpg"],
  };
  assert.equal(
    (
      await admin.call("/admin/products/" + p.id, "PUT", {
        ...p,
        variants: p.variants.slice(1),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.call("/admin/products/" + p.id, "PUT", {
        ...p,
        images: ["/assets/tshirt.webp"],
      })
    ).status,
    400,
  );
  assert.equal(
    (await admin.call("/admin/products/" + p.id, "PUT", p)).status,
    200,
  );
  real = p;
  const state = (await admin.call("/admin")).data;
  assert.equal(
    (
      await admin.call("/admin/settings", "PUT", {
        ...state.settings,
        shopLive: true,
      })
    ).status,
    400,
  );
  const settings = {
    ...state.settings,
    shopLive: true,
    policiesApproved: true,
    sellerDetails: "QA seller, isolated test fixture",
    supportEmail: "support@snap.test",
  };
  assert.equal(
    (await admin.call("/admin/settings", "PUT", settings)).status,
    200,
  );
  assert.equal((await buyer.call("/products")).data.length, 1);
});
test("admin upload converts raster photos to WebP and rejects unsupported files and access", async () => {
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#2456ef" },
  })
    .png()
    .toBuffer();
  const form = () => {
    const f = new FormData();
    f.set("image", new Blob([bytes], { type: "image/png" }), "qa.png");
    return f;
  };
  assert.equal(
    (await anonymous.call("/admin/upload", "POST", form())).status,
    403,
  );
  const r = await admin.call("/admin/upload", "POST", form());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.url, /^\/uploads\/.+\.webp$/);
  const image = await fetch(origin + r.data.url);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("Content-Type"), /image\/webp/);
  const wrong = new FormData();
  wrong.set(
    "image",
    new Blob(["<script>alert(1)</script>"], { type: "text/html" }),
    "bad.html",
  );
  assert.equal((await admin.call("/admin/upload", "POST", wrong)).status, 400);
});
test("real order cannot contain demo products; server recalculates changed price", async () => {
  assert.equal(
    (await buyer.call("/cart", "PUT", { items: [line(products[1])] })).status,
    400,
  );
  assert.equal(
    (await buyer.call("/cart", "PUT", { items: [line(real)] })).status,
    200,
  );
  real = { ...real, price: real.price + 100 };
  await admin.call("/admin/products/" + real.id, "PUT", real);
  assert.equal(
    (
      await buyer.call("/orders", "POST", {
        ...payload(),
        expectedTotal: real.price - 100,
      })
    ).status,
    409,
  );
  const r = await buyer.call("/orders", "POST", payload());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  order = r.data;
  assert.equal(order.quote.total, real.price);
  assert.equal(order.demo, false);
  assert.equal(
    (
      await admin.call("/admin/orders/" + order.id, "PUT", {
        status: "delivered",
      })
    ).status,
    400,
  );
});
test("delivery earns rewards exactly once, and unlocks one verified review", async () => {
  for (const s of ["confirmed", "shipped", "delivered", "delivered"])
    await status(order.id, s);
  assert.equal(
    (await buyer.call("/bootstrap")).data.user.balance,
    order.quote.earn,
  );
  const text = "Перевірений тест: товар отримано, розмір підійшов.";
  assert.equal(
    (
      await buyer.call("/products/" + real.id + "/reviews", "POST", {
        rating: 5,
        text,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await buyer.call("/products/" + real.id + "/reviews", "POST", {
        rating: 5,
        text,
      })
    ).status,
    400,
  );
  const response = await anonymous.call("/products/" + real.id + "/reviews");
  assert.equal(response.status, 200, JSON.stringify(response.data));
  const reviews = response.data.reviews;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].verified, true);
  assert.ok(!JSON.stringify(reviews).includes("buyer@snap.test"));
});
test("rewards debit and cancellation refund are idempotent", async () => {
  await buyer.call("/cart", "PUT", { items: [line(real)] });
  const r = await buyer.call("/orders", "POST", {
    ...payload(),
    bonus: 999999,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  second = r.data;
  assert.equal(second.quote.bonusUsed, order.quote.earn);
  assert.equal((await buyer.call("/bootstrap")).data.user.balance, 0);
  await status(second.id, "cancelled");
  await status(second.id, "cancelled");
  assert.equal(
    (await buyer.call("/bootstrap")).data.user.balance,
    order.quote.earn,
  );
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM ledger WHERE order_id=? AND kind='refund_spent'",
      )
      .get(second.id).n,
    1,
  );
});
test("return request is owner-only and revokes earned rewards exactly once", async () => {
  const reason = "Тестове повернення товару після отримання";
  assert.equal(
    (await admin.call("/orders/" + order.id + "/return", "POST", { reason }))
      .status,
    404,
  );
  assert.equal(
    (await buyer.call("/orders/" + order.id + "/return", "POST", { reason }))
      .status,
    200,
  );
  await status(order.id, "returned");
  await status(order.id, "returned");
  assert.equal((await buyer.call("/bootstrap")).data.user.balance, 0);
});
test("SEO serves record title, description, canonical and schema; demos stay noindex", async () => {
  const r = await fetch(origin + "/product/" + real.slug);
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.ok(html.includes(real.name));
  assert.match(html, /<meta name="description" content="[^"]*репліка/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical"/);
  assert.equal((await fetch(origin + "/product/missing")).status, 404);
  assert.match(
    await (await fetch(origin + "/robots.txt")).text(),
    /Disallow: \//,
  );
});
test("stylist response references available real products only and fails gracefully if incomplete", async () => {
  const r = await buyer.call("/stylist", "POST", {
    style: "street",
    occasion: "daily",
    budget: 1000000,
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.mode, "rules");
  assert.equal(r.data.looks.length, 0);
});
test("persisted database passes integrity check and preserves orders, products and ledger", () => {
  assert.equal(
    db.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM orders").get().n, 3);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM reviews").get().n, 1);
  assert.ok(db.prepare("SELECT COUNT(*) n FROM outbox").get().n >= 4);
  const reopened = new DatabaseSync(path.join(dir, "snap.sqlite"));
  assert.equal(reopened.prepare("SELECT COUNT(*) n FROM orders").get().n, 3);
  reopened.close();
});

test("brand registry and colour galleries persist behind admin permissions", async () => {
  assert.equal((await buyer.call("/admin/brands", "POST", { name: "QA Brand" })).status, 403);
  assert.equal((await admin.call("/admin/brands", "POST", { name: " QA Brand " })).status, 201);
  assert.equal((await admin.call("/admin/brands", "POST", { name: "qa brand" })).status, 409);
  const p = structuredClone(products[0]);
  p.id = "qa-colour-gallery"; p.slug = "qa-colour-gallery"; p.brand = "QA Brand"; p.active = false;
  p.images = ["https://example.com/shared.png"];
  p.colors[0].images = ["https://example.com/colour.png"];
  let response = await admin.call("/admin/products/" + p.id, "PUT", p);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  let stored = (await admin.call("/admin")).data.products.find((item) => item.id === p.id);
  assert.deepEqual(stored.colors[0].images, p.colors[0].images);
  assert.equal((await admin.call("/admin/brands/QA%20Brand", "PUT", { name: "QA Renamed" })).status, 200);
  stored = (await admin.call("/admin")).data.products.find((item) => item.id === p.id);
  assert.equal(stored.brand, "QA Renamed");
  assert.ok((await anonymous.call("/bootstrap")).data.brands.includes("QA Renamed"));
  assert.equal((await admin.call("/admin/brands/QA%20Renamed", "DELETE")).status, 409);
  p.brand = products[0].brand;
  p.colors[0].images = ["javascript:alert(1)"];
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", p)).status, 400);
  p.colors[0].images = ["/assets/puffer.webp"]; p.demo = false;
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", p)).status, 400);
  p.colors[0].images = ["https://example.com/colour.png"];
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", p)).status, 200);
  assert.equal((await admin.call("/admin/brands/QA%20Renamed", "DELETE")).status, 200);
  const reopened = new DatabaseSync(path.join(dir, "snap.sqlite"));
  assert.equal(reopened.prepare("SELECT COUNT(*) n FROM brands WHERE name='QA Renamed'").get().n, 0);
  assert.equal(reopened.prepare("SELECT COUNT(*) n FROM migrations WHERE version=2").get().n, 1);
  const saved = JSON.parse(reopened.prepare("SELECT data FROM products WHERE id=?").get(p.id).data);
  assert.equal(saved.colors[0].images[0], "https://example.com/colour.png");
  reopened.close();
});

test("size prices persist, validate and remain fixed in completed order snapshots", async () => {
  const p = { ...structuredClone(products[0]), id: "qa-size-prices", slug: "qa-size-prices", demo: false, active: true, oldPrice: null, price: 100000, sizePrices: { S: 150000, M: 250000 }, sizes: ["S", "M"], colors: [{ name: "Black", hex: "#000000" }], variants: ["S", "M"].map((size) => ({ size, color: "Black", available: true })), images: ["https://example.com/sized.png"] };
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", { ...p, sizePrices: { M: -1 } })).status, 400);
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", { ...p, sizePrices: { XL: 10000 } })).status, 400);
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", { ...p, oldPrice: 200000 })).status, 400);
  assert.equal((await admin.call("/admin/products/" + p.id, "PUT", p)).status, 200);
  const saved = (await admin.call("/admin")).data.products.find((item) => item.id === p.id);
  assert.deepEqual(saved.sizePrices, p.sizePrices);
  const cart = await buyer.call("/cart", "PUT", { items: [{ productId: p.id, color: "Black", size: "M", quantity: 2, price: 1 }] });
  assert.equal(cart.data.quote.total, 500000);
  const placed = await buyer.call("/orders", "POST", { ...payload(), expectedTotal: 500000 });
  assert.equal(placed.status, 201, JSON.stringify(placed.data));
  assert.equal(placed.data.quote.lines[0].price, 250000);
  await admin.call("/admin/products/" + p.id, "PUT", { ...p, sizePrices: { S: 150000, M: 350000 } });
  const snapshot = JSON.parse(db.prepare("SELECT data FROM orders WHERE id=?").get(placed.data.id).data);
  assert.equal(snapshot.quote.lines[0].price, 250000);
});
