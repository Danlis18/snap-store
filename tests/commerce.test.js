import { priceRange, sizePrice } from "../shared/product-pricing.js";
import test from "node:test";
import assert from "node:assert/strict";
import { quoteCart, bulkPercent } from "../server/commerce.js";
import { seedProducts, defaultSettings } from "../server/seed.js";
import { recommendLooks } from "../server/stylist.js";
const p = {
  id: "test",
  active: true,
  demo: false,
  name: "Test",
  price: 100000,
  images: ["/image.webp"],
  variants: [
    { color: "Black", size: "M", available: true },
    { color: "Black", size: "S", available: false },
  ],
};
const quote = (qty, extra = {}) =>
  quoteCart({
    items: [{ productId: p.id, color: "Black", size: "M", quantity: qty }],
    product: () => p,
    settings: defaultSettings,
    ...extra,
  });
test("quantity discounts: 4/5/6/19/20/21 and integer rounding", () => {
  assert.deepEqual(
    [4, 5, 6, 19, 20, 21].map(bulkPercent),
    [0, 5, 6, 19, 20, 20],
  );
  assert.equal(quote(5).total, 475000);
  assert.equal(quote(6).total, 564000);
  assert.equal(quote(20).total, 1600000);
});
test("only better promo applies; rewards capped after discount", () => {
  const promo = {
    code: "SAVE",
    percent: 10,
    active: true,
    min_total: 0,
    used: 0,
    max_uses: 0,
  };
  const q = quote(5, { promo, balance: 100000, bonus: 100000 });
  assert.equal(q.percent, 10);
  assert.equal(q.bonusUsed, 45000);
  assert.equal(q.total, 405000);
  assert.equal(quote(20, { promo }).promoCode, null);
});
test("free shipping threshold is evaluated after all discounts", () => {
  const product = () => ({ ...p, price: 777700 });
  assert.equal(quote(1, { product }).freeShipping, true);
  assert.equal(quote(1, { product, balance: 1, bonus: 1 }).freeShipping, false);
});
test("invalid, unavailable, duplicated and demo variants cannot circumvent validation", () => {
  assert.throws(() => quote(0));
  assert.throws(() => quote(1.5));
  assert.throws(() => quote(51));
  assert.throws(() =>
    quote(1, {
      items: [{ productId: "test", color: "Black", size: "S", quantity: 1 }],
    }),
  );
  assert.throws(() =>
    quote(1, { product: () => ({ ...p, demo: true }), allowDemo: false }),
  );
  assert.throws(() =>
    quote(1, {
      items: Array(2).fill({
        productId: "test",
        color: "Black",
        size: "M",
        quantity: 30,
      }),
    }),
  );
  assert.equal(
    quote(1, {
      items: [
        { productId: "test", color: "Black", size: "M", quantity: 1, price: 1 },
      ],
    }).subtotal,
    100000,
  );
});
test("expired/exhausted/minimum promos fail", () => {
  const promo = {
    code: "SAVE",
    percent: 10,
    active: true,
    min_total: 0,
    used: 0,
    max_uses: 0,
  };
  for (const bad of [
    { active: false },
    { expires: "2000-01-01T00:00:00Z" },
    { max_uses: 1, used: 1 },
    { min_total: 200000 },
  ])
    assert.throws(() => quote(1, { promo: { ...promo, ...bad } }));
});
test("stylist creates distinct complete available outfits within budget and respects style", () => {
  const all = seedProducts();
  for (const style of ["street", "minimal", "sport"])
    for (const occasion of ["daily", "university", "evening"]) {
      const looks = recommendLooks(all, { style, occasion, budget: 1000000 });
      assert.equal(looks.length, 3);
      assert.equal(
        new Set(looks.map((g) => g.map((p) => p.id).join())).size,
        3,
      );
      for (const g of looks) {
        assert.equal(g.length, 3);
        assert.ok(g.reduce((s, p) => s + p.price, 0) <= 1000000);
        assert.ok(g.every((p) => p.variants.some((v) => v.available)));
      }
    }
  assert.equal(
    recommendLooks(all, {
      style: "street",
      occasion: "daily",
      budget: 1000000,
    })[0][0].type,
    "hoodie",
  );
  assert.equal(
    recommendLooks(all, {
      style: "minimal",
      occasion: "daily",
      budget: 1000000,
    })[0][0].type,
    "tshirt",
  );
  assert.equal(
    recommendLooks(all, { style: "minimal", occasion: "daily", budget: 1 })
      .length,
    0,
  );
});

test("size prices drive line totals, discounts and delivery while ignoring client prices", () => {
  const sized = { ...p, sizes: ["S", "M", "L"], price: 90000, sizePrices: { S: 100000, M: 200000, L: 300000 }, variants: ["S", "M", "L"].map((size) => ({ size, color: "Black", available: size !== "S" })) };
  assert.deepEqual(priceRange(sized), { min: 200000, max: 300000 });
  assert.equal(sizePrice({ ...sized, sizePrices: {} }, "M"), 90000);
  const q = quoteCart({ items: [{ productId: p.id, color: "Black", size: "M", quantity: 3, price: 1 }, { productId: p.id, color: "Black", size: "L", quantity: 2, price: 1 }], product: () => sized, settings: defaultSettings });
  assert.equal(q.lines[0].price, 200000);
  assert.equal(q.lines[1].total, 600000);
  assert.equal(q.subtotal, 1200000);
  assert.equal(q.discount, 60000);
  assert.equal(q.total, 1140000);
  assert.equal(q.freeShipping, true);
  assert.equal(q.earn, Math.floor(q.total * defaultSettings.bonusPercent / 100));
});
