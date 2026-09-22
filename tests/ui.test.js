// DOM-level journey checks. They do not replace browser layout, touch or WebGL QA.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Window } from "happy-dom";
import { build } from "esbuild";
import { seedProducts, defaultSettings, brands } from "../server/seed.js";
import { quoteCart } from "../server/commerce.js";
import React from "react";
const products = seedProducts();
products[0].sizePrices = { M: 234500 };
products[0].oldPrice = null;
products[0].colors[1].images = ["https://example.com/colour-front.png", "https://example.com/colour-back.png"];
let savedProduct;
const state = {
  csrf: "test",
  settings: { ...defaultSettings, devAuth: false, mailReady: false },
  brands,
  user: null,
  cart: [],
  wishlist: [],
  recent: [],
};
const win = new Window({ url: "http://localhost:4173/" });
// Match older browsers and HTTP previews where randomUUID is not exposed.
Object.defineProperty(globalThis, "crypto", {
  value: { getRandomValues: crypto.getRandomValues.bind(crypto) },
  configurable: true,
});
win.document.body.innerHTML = '<div id="root"></div>';
win.document.head.innerHTML =
  '<title>SNAP</title><meta name="description"><meta name="robots"><link rel="canonical" href="http://localhost:4173/">';
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLDialogElement",
  "Node",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "location",
  "history",
  "localStorage",
  "matchMedia",
  "ResizeObserver",
  "IntersectionObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  const val = key === "window" ? win : win[key];
  Object.defineProperty(globalThis, key, {
    value:
      typeof val === "function" &&
      ["matchMedia", "requestAnimationFrame", "cancelAnimationFrame"].includes(
        key,
      )
        ? val.bind(win)
        : val,
    configurable: true,
  });
}
Object.defineProperty(globalThis, "devicePixelRatio", {
  value: 1,
  configurable: true,
});
win.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
win.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const tools = new Map();
win.document.modelContext = {
  registerTool(tool, { signal }) {
    tools.set(tool.name, tool);
    signal.addEventListener("abort", () => tools.delete(tool.name));
  },
};
const errors = [];
win.addEventListener("error", (e) => errors.push(String(e.error || e.message)));
const fetchMock = async (url, opts = {}) => {
  const route = String(url).replace("/api", ""),
    body = opts.body instanceof FormData ? opts.body : opts.body ? JSON.parse(opts.body) : {};
  let result;
  if (route === "/bootstrap") result = state;
  else if (route === "/products") result = products;
  else if (route === "/cart") {
    state.cart = body.items;
    result = {
      items: state.cart,
      quote: quoteCart({
        items: state.cart,
        settings: state.settings,
        product: (id) => products.find((p) => p.id === id),
      }),
    };
  } else if (route === "/quote")
    result = quoteCart({
      items: state.cart,
      settings: state.settings,
      product: (id) => products.find((p) => p.id === id),
    });
  else if (route === "/wishlist") {
    state.wishlist = body.items;
    result = body.items;
  } else if (route === "/recent") {
    state.recent = [body.id];
    result = state.recent;
  } else if (route.endsWith("/reviews"))
    result = { reviews: [], canReview: false };
  else if (route === "/admin/upload") { assert.ok(body.get("image")); result = { url: "/uploads/pasted-photo.webp" }; }
  else if (route.startsWith("/admin/products/") && opts.method === "PUT") { savedProduct = body; result = body; }
  else if (route === "/orders") result = [];
  else if (route === "/stylist") result = { mode: "rules", looks: [] };
  else if (route === "/admin")
    result = {
      products,
      brands,
      settings: state.settings,
      orders: [],
      customers: [],
      promos: [],
      newsletter: [],
      mail: [],
      audit: [],
      readiness: {
        mail: false,
        orderEmail: false,
        persistentData: false,
        ai: false,
      },
    };
  else result = { error: "Unsupported test route " + route };
  return new Response(JSON.stringify(result), {
    status: result?.error ? 404 : 200,
    headers: { "Content-Type": "application/json" },
  });
};
globalThis.fetch = fetchMock;
win.fetch = fetchMock;
const out = path.join(process.cwd(), "qa", "ui-test.cjs");
await mkdir(path.dirname(out), { recursive: true });
await build({
  entryPoints: ["src/main.jsx"],
  outfile: out,
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  loader: { ".css": "empty" },
  logLevel: "silent",
});
const { appRoot, Storefront } = createRequire(import.meta.url)(out);
const until = async (check) => {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail(
    "DOM did not reach expected state: " +
      win.document.body.textContent.slice(-500),
  );
};
const text = () => win.document.body.textContent;
function go(url) {
  win.history.pushState(null, "", url);
  win.dispatchEvent(new win.Event("popstate"));
}
after(async () => {
  appRoot.unmount();
  await win.happyDOM.abort();
  await win.happyDOM.close();
  await rm(out, { force: true });
});
test("home renders loaded product cards and meaningful heading without runtime errors", async () => {
  await until(
    () => win.document.querySelectorAll(".product-card").length === 8,
  );
  assert.match(win.document.querySelector("h1").textContent, /Твій стиль/);
  assert.equal(errors.length, 0);
});
test("theme, language and wishlist controls update persisted preference and app state", async () => {
  win.document.querySelector('button[aria-label="Темна тема"]').click();
  await until(() => win.document.documentElement.dataset.theme === "dark");
  assert.equal(win.localStorage.getItem("snap-theme"), "dark");
  win.document.querySelector("button.language").click();
  await until(() => win.document.documentElement.lang === "en");
  assert.match(win.document.querySelector("h1").textContent, /Your style/);
  win.document.querySelector('button[aria-label="Add to wishlist"]').click();
  await until(() => state.wishlist.length === 1);
  win.document.querySelector("button.language").click();
  await until(() => win.document.documentElement.lang === "uk");
});
test("catalog renders, product page selects available size and stages the cart", async () => {
  go("/catalog");
  await until(() => win.document.querySelector(".catalog-layout"));
  assert.ok(win.document.querySelectorAll(".product-card").length >= 4);
  const product = products[0];
  go("/product/" + product.slug);
  await until(() => win.document.querySelector(".product-description"));
  const sizeButtons = [...win.document.querySelectorAll("button")].filter(
    (b) => b.textContent.trim() === "M",
  );
  assert.ok(sizeButtons.length);
  sizeButtons[0].click();
  await until(() => win.document.querySelector(".detail-price").textContent.replace(/\s/g, "").includes("2345"));
  const add = [...win.document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Додати в кошик"),
  );
  assert.ok(add, "Product add button");
  await until(() => !add.disabled);
  add.click();
  await until(() => state.cart.length === 1);
  assert.equal(state.cart[0].productId, product.id);
});
test("colour selection changes product gallery and cart image with legacy fallback", async () => {
  const product = products[0];
  const color = product.colors[1];
  assert.ok(color);
  color.images = ["https://example.com/colour-front.png", "https://example.com/colour-back.png"];
  go("/product/" + product.slug);
  await until(() => win.document.querySelector(".gallery"));
  win.document.querySelector(`.color-picker button[aria-label="${color.name}"]`).click();
  await until(() => win.document.querySelector(".main-photo img").getAttribute("src") === color.images[0]);
  assert.equal(win.document.querySelectorAll(".thumbnails button").length, 2);
  win.document.querySelectorAll(".thumbnails button")[1].click();
  await until(() => win.document.querySelector(".main-photo img").getAttribute("src") === color.images[1]);
  win.document.querySelectorAll(".color-picker button")[0].click();
  await until(() => win.document.querySelector(".main-photo img").getAttribute("src") === product.images[0]);
  const variant = product.variants.find((v) => v.color === color.name && v.available);
  const quote = quoteCart({ items: [{ productId: product.id, color: color.name, size: variant.size, quantity: 1 }], settings: state.settings, product: () => product });
  assert.equal(quote.lines[0].image, color.images[0]);
});
test("checkout, account and admin show honest authentication boundaries", async () => {
  go("/checkout");
  await until(() => text().includes("Оформлення"));
  assert.ok(win.document.querySelector('input[type="email"]'));
  go("/account");
  await until(
    () =>
      win.document.querySelector('.account-page input[type="email"]') ||
      win.document.querySelector(".login-form"),
  );
  assert.equal(errors.length, 0);
  go("/admin");
  await until(
    () => text().includes("адміністратора") || text().includes("Адміністратор"),
  );
  assert.equal(errors.length, 0);
});
test("agent tools read catalog and stage the same visible cart, rejecting invalid input", async () => {
  assert.ok(tools.has("read_catalog"));
  assert.ok(tools.has("stage_cart_items"));
  const list = await tools
    .get("read_catalog")
    .execute({ query: products[0].brand });
  assert.equal(list.length, 10);
  const stage = tools.get("stage_cart_items");
  const before = state.cart.map((i) => ({ ...i }));
  await assert.rejects(() =>
    stage.execute({
      items: [{ productId: "missing", color: "x", size: "x", quantity: 1 }],
    }),
  );
  assert.deepEqual(state.cart, before);
  const p = products[1],
    v = p.variants.find((v) => v.available);
  const result = await stage.execute({
    items: [{ productId: p.id, color: v.color, size: v.size, quantity: 1 }],
  });
  assert.equal(result.orderPlaced, false);
  assert.ok(state.cart.some((i) => i.productId === p.id));
  await until(() => win.document.querySelector("dialog[open]"));
});
test("authenticated administrator can open all management panels and product editor", async () => {
  state.user = {
    id: "fixture-admin",
    name: "QA Admin",
    email: "admin@snap.test",
    phone: "",
    addresses: [],
    balance: 0,
    isAdmin: true,
  };
  go("/admin");
  appRoot.render(React.createElement(Storefront, { key: "admin-session" }));
  await until(() => win.document.querySelector(".admin-tabs"));
  assert.ok(win.document.querySelector(".admin-toolbar"));
  const clickTab = async (label, check) => {
    [...win.document.querySelectorAll(".admin-tabs button")]
      .find((b) => b.textContent === label)
      .click();
    await until(check);
  };
  await clickTab(
    "Товари",
    () => win.document.querySelectorAll(".product-cell").length === 100,
  );
  [...win.document.querySelectorAll(".admin-table button")]
    .find((b) => b.textContent === "Редагувати")
    .click();
  await until(() =>
    win.document.querySelector('dialog[open] input[type="file"]'),
  );
  assert.match(
    win.document.querySelector("dialog[open]").textContent,
    /Кольори та розміри/,
  );
  const editor = win.document.querySelector("dialog[open]");
  editor.click();
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(editor.open, "Backdrop click must preserve editor");
  const cancel = new win.Event("cancel", { cancelable: true });
  editor.dispatchEvent(cancel);
  assert.ok(cancel.defaultPrevented, "Escape must not dismiss editor");
  assert.ok(editor.open);
  assert.ok([...editor.querySelectorAll("select option")].some((o) => o.textContent === brands[0]));
  assert.match(editor.textContent, /Вставити з буфера/);
  for (const size of ["S", "M", "L", "XL", "XXL"]) assert.ok(editor.querySelector(`input[aria-label="Розмір ${size}"]`));
  const sizePriceInput = editor.querySelector('input[aria-label="Ціна розміру M, грн"]');
  assert.equal(sizePriceInput.value, "2345");
  const xlCheck = editor.querySelector('input[aria-label="Розмір XXL"]');
  if (!xlCheck.checked) xlCheck.click();
  await until(() => !editor.querySelector('input[aria-label="Ціна розміру XXL, грн"]').disabled);
  const gallerySelect = [...editor.querySelectorAll("select")].find((select) => select.options[0]?.textContent.includes("Спільні фото"));
  gallerySelect.value = "1";
  gallerySelect.dispatchEvent(new win.Event("change", { bubbles: true }));
  await until(() => editor.querySelectorAll(".admin-image").length === 2);
  const paste = new win.Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(paste, "clipboardData", { value: { items: [{ kind: "file", type: "image/png", getAsFile: () => new File(["image bytes"], "pasted.png", { type: "image/png" }) }] } });
  editor.querySelector("form").dispatchEvent(paste);
  await until(() => editor.querySelector('img[src="/uploads/pasted-photo.webp"]'));
  assert.ok(paste.defaultPrevented);
  editor.querySelector("form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
  await until(() => editor.querySelector(".saved-message"));
  assert.ok(editor.open, "Saving must preserve editor");
  assert.equal(savedProduct.sizePrices.M, 234500);
  assert.ok(savedProduct.sizes.includes("XXL"));
  assert.ok(savedProduct.colors[1].images.includes("/uploads/pasted-photo.webp"));
  assert.ok(!savedProduct.images.includes("/uploads/pasted-photo.webp"), "Colour upload must not replace an existing shared cover");
  win.document
    .querySelector('dialog[open] button[aria-label="Закрити / Close"]')
    .click();
  await clickTab("Налаштування", () =>
    win.document.querySelector(".settings-grid"),
  );
  assert.match(text(), /Товар на головному банері/);
  for (const label of [
    "Бренди",
    "Замовлення",
    "Клієнти",
    "Промокоди",
    "Пошта",
    "Підписники",
  ]) {
    await clickTab(label, () =>
      [...win.document.querySelectorAll(".admin-tabs button.active")].some(
        (b) => b.textContent === label,
      ),
    );
    assert.ok(win.document.querySelector(".admin-page"));
    assert.equal(errors.length, 0);
  }
});
