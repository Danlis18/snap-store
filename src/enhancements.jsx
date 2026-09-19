import React, { useEffect, useRef, useState } from "react";
import { useShop, useRoute, Link } from "./core";

export function AgentTools() {
  const shop = useShop(),
    latest = useRef(shop);
  latest.current = shop;
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool) =>
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    register({
      name: "read_catalog",
      title: "Read SNAP catalog",
      description:
        "Read available products, prices in integer UAH kopecks and color/size availability. Does not change the page.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", maxLength: 100 } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input = {}) {
        if (
          typeof input.query !== "undefined" &&
          (typeof input.query !== "string" || input.query.length > 100)
        )
          throw Error("Invalid query");
        const q = (input.query || "").toLowerCase();
        return latest.current.products
          .filter((p) =>
            (p.name + " " + p.nameEn + " " + p.brand).toLowerCase().includes(q),
          )
          .slice(0, 100)
          .map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            price: p.price,
            currency: "UAH",
            demo: p.demo,
            variants: p.variants,
          }));
      },
    });
    register({
      name: "stage_cart_items",
      title: "Add selected items to bag",
      description:
        "Add specified available product variants to the same visible SNAP bag. Opens the bag for review. Does not submit an order or make payment.",
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                color: { type: "string" },
                size: { type: "string" },
                quantity: { type: "integer", minimum: 1, maximum: 20 },
              },
              required: ["productId", "color", "size", "quantity"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (
          !Array.isArray(input?.items) ||
          !input.items.length ||
          input.items.length > 10
        )
          throw Error("Choose 1–10 variants");
        const s = latest.current,
          items = (s.cart || []).map((i) => ({ ...i }));
        for (const item of input.items) {
          const p = s.products.find((p) => p.id === item.productId);
          if (
            !p ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 20 ||
            !p.variants.some(
              (v) =>
                v.color === item.color && v.size === item.size && v.available,
            )
          )
            throw Error("Unavailable variant or invalid quantity");
          const old = items.find(
            (i) =>
              i.productId === p.id &&
              i.color === item.color &&
              i.size === item.size,
          );
          if (old) old.quantity += item.quantity;
          else
            items.push({
              productId: p.id,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
            });
        }
        const result = await s.saveCart(items);
        s.setCartOpen(true);
        return {
          staged: true,
          quantity: result.quote.quantity,
          total: result.quote.total,
          currency: "UAH",
          orderPlaced: false,
        };
      },
    });
    return () => lifecycle.abort();
  }, []);
  return null;
}

let enabled = false;
export function trackCommerce(name, details) {
  if (!enabled) return;
  window.gtag?.("event", name, details);
  const names = {
    add_to_cart: "AddToCart",
    purchase: "Purchase",
    begin_checkout: "InitiateCheckout",
  };
  if (names[name])
    window.fbq?.("track", names[name], {
      currency: "UAH",
      value: details.value,
      content_ids: details.items?.map((i) => i.item_id),
      content_type: "product",
    });
  const tik = {
    add_to_cart: "AddToCart",
    purchase: "CompletePayment",
    begin_checkout: "InitiateCheckout",
  };
  if (tik[name])
    window.ttq?.track(tik[name], {
      currency: "UAH",
      value: details.value,
      contents: details.items?.map((i) => ({
        content_id: i.item_id,
        quantity: i.quantity,
        price: i.price,
      })),
      content_type: "product",
    });
}
function script(src, id) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.src = src;
  el.async = true;
  document.head.appendChild(el);
}
function activate(s) {
  if (s.gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("config", s.gaId, {
      send_page_view: false,
      allow_google_signals: false,
    });
    script("https://www.googletagmanager.com/gtag/js?id=" + s.gaId, "snap-ga");
  }
  if (s.metaPixelId) {
    if (!window.fbq) {
      const f = function () {
        f.callMethod
          ? f.callMethod.apply(f, arguments)
          : f.queue.push(arguments);
      };
      f.queue = [];
      f.push = f;
      f.loaded = true;
      f.version = "2.0";
      window.fbq = f;
      window._fbq = f;
    }
    window.fbq("init", s.metaPixelId);
    script("https://connect.facebook.net/en_US/fbevents.js", "snap-meta");
  }
  if (s.tiktokPixelId) {
    window.TiktokAnalyticsObject = "ttq";
    const q = (window.ttq = window.ttq || []);
    for (const name of [
      "page",
      "track",
      "identify",
      "ready",
      "holdConsent",
      "revokeConsent",
      "grantConsent",
    ])
      q[name] =
        q[name] ||
        function () {
          q.push([name, ...arguments]);
        };
    q._i = q._i || {};
    q._i[s.tiktokPixelId] = [];
    q._i[s.tiktokPixelId]._u =
      "https://analytics.tiktok.com/i18n/pixel/events.js";
    q._t = q._t || {};
    q._t[s.tiktokPixelId] = Date.now();
    q._o = q._o || {};
    q._o[s.tiktokPixelId] = {};
    script(
      "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" +
        s.tiktokPixelId +
        "&lib=ttq",
      "snap-tiktok",
    );
  }
}
export function Consent() {
  const { settings: s, t } = useShop(),
    route = useRoute();
  const [choice, setChoice] = useState(() =>
    localStorage.getItem("snap-consent-v1"),
  );
  const [open, setOpen] = useState(false);
  const ready = s?.shopLive && s?.analyticsEnabled;
  useEffect(() => {
    const fn = (e) => trackCommerce(e.detail.name, e.detail.data);
    window.addEventListener("snap-commerce", fn);
    return () => window.removeEventListener("snap-commerce", fn);
  }, []);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("snap-consent", show);
    return () => window.removeEventListener("snap-consent", show);
  }, []);
  useEffect(() => {
    enabled = Boolean(ready && choice === "yes");
    if (enabled) activate(s);
    return () => {
      enabled = false;
    };
  }, [ready, choice, s?.gaId, s?.metaPixelId, s?.tiktokPixelId]);
  useEffect(() => {
    if (!enabled || /^\/(admin|account|checkout)/.test(route)) return;
    window.gtag?.("event", "page_view", {
      page_location: location.origin + location.pathname,
      page_title: document.title,
    });
    window.fbq?.("track", "PageView");
    window.ttq?.page();
  }, [route, choice, ready]);
  function choose(value) {
    const was = choice === "yes";
    localStorage.setItem("snap-consent-v1", value);
    setChoice(value);
    setOpen(false);
    if (was && value === "no") {
      enabled = false;
      window.fbq?.("consent", "revoke");
      window.ttq?.revokeConsent();
      if (s.gaId) window["ga-disable-" + s.gaId] = true;
      for (const c of document.cookie.split(";")) {
        const n = c.trim().split("=")[0];
        if (/^(_ga|_fbp|_fbc|_ttp)/.test(n)) {
          document.cookie = n + "=; Max-Age=0; path=/";
          document.cookie =
            n + "=; Max-Age=0; path=/; domain=" + location.hostname;
        }
      }
      location.reload();
    }
  }
  if (!ready || (choice && !open)) return null;
  return (
    <aside
      className="consent-banner"
      aria-label={t("Налаштування cookies", "Cookie settings")}
    >
      <b>{t("Твій вибір має значення", "Your choice matters")}</b>
      <p>
        {t(
          "Необхідні cookies підтримують вхід і кошик. За твоєю згодою аналітика допоможе нам покращувати магазин.",
          "Essential cookies keep sign-in and bag working. With your consent, analytics help us improve the store.",
        )}
      </p>
      <Link to="/privacy">
        {t("Політика конфіденційності", "Privacy policy")}
      </Link>
      <div>
        <button className="button outline" onClick={() => choose("no")}>
          {t("Лише необхідні", "Essential only")}
        </button>
        <button className="button" onClick={() => choose("yes")}>
          {t("Дозволити", "Allow")}
        </button>
      </div>
    </aside>
  );
}
