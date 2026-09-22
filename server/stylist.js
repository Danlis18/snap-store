import { priceRange } from "../shared/product-pricing.js";
// Deterministic fallback: uses all three answers and returns distinct, in-stock looks.
export function recommendLooks(all, { style, occasion, budget }) {
  const available = all.filter(
    (p) => p.active && p.variants.some((v) => v.available),
  );
  const isDark = (p) =>
    /чорн|графіт|black|charcoal/i.test(p.colors[0]?.name || "");
  const score = (p) => {
    let value = 0;
    if (style === "street") value += p.type === "hoodie" ? 8 : 0;
    if (style === "minimal") value += p.type === "tshirt" ? 8 : 0;
    if (style === "sport")
      value += /tech|run|sport|mesh/i.test(p.nameEn + " " + p.fit) ? 8 : 0;
    if (occasion === "evening") value += isDark(p) ? 6 : 0;
    if (occasion === "university") value += p.type === "hoodie" ? 5 : 0;
    if (occasion === "daily") value += priceRange(p).min < budget / 3 ? 3 : 0;
    return value;
  };
  const pools = [["tshirt", "hoodie"], ["trousers"], ["sneakers"]].map(
    (types) =>
      available
        .filter((p) => types.includes(p.type))
        .sort((a, b) => score(b) - score(a) || priceRange(a).min - priceRange(b).min)
        .slice(0, 40),
  );
  const candidates = [];
  for (const top of pools[0])
    for (const bottom of pools[1])
      for (const shoes of pools[2]) {
        const products = [top, bottom, shoes];
        const total = products.reduce((sum, p) => sum + priceRange(p).min, 0);
        if (total <= budget)
          candidates.push({
            products,
            score: products.reduce((s, p) => s + score(p), 0),
            total,
          });
      }
  candidates.sort((a, b) => b.score - a.score || a.total - b.total);
  const selected = [];
  for (let i = 0; i < 3 && candidates.length; i++) {
    // Penalize reused products, while retaining preference and budget constraints.
    const used = new Set(selected.flat().map((p) => p.id));
    candidates.sort(
      (a, b) =>
        b.score -
          b.products.filter((p) => used.has(p.id)).length * 8 -
          (a.score - a.products.filter((p) => used.has(p.id)).length * 8) ||
        a.total - b.total,
    );
    selected.push(candidates.shift().products);
  }
  return selected;
}
